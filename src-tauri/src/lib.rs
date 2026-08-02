use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::time::Duration;

use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

/// Port the Next.js server listens on.
const SIDECAR_PORT: u16 = 1420;

/// Max time to wait for the sidecar to boot.
const STARTUP_TIMEOUT_SECS: u64 = 30;

/// Max time to wait for migration to complete.
const MIGRATE_TIMEOUT_SECS: u64 = 60;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/// Bundled Next.js standalone server directory (inside the app resource dir).
fn server_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .resource_dir()
        .expect("resource dir should exist")
        .join("server")
}

/// Writable app data directory — persists the SQLite DB across launches.
/// macOS:   ~/Library/Application Support/com.dayflow.app/
/// Windows: %APPDATA%/com.dayflow.app/
fn data_dir(app: &tauri::AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("app data dir should exist");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// SQLite database URL for the sidecar.
fn db_url(app: &tauri::AppHandle) -> String {
    format!("file:{}", data_dir(app).join("data.db").display())
}

// ---------------------------------------------------------------------------
// Health checks
// ---------------------------------------------------------------------------

/// True when the given TCP port is accepting connections.
fn port_ready(port: u16) -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{port}").parse().unwrap(),
        Duration::from_millis(200),
    )
    .is_ok()
}

fn wait_for_port(port: u16) -> Result<(), String> {
    let deadline = std::time::Instant::now() + Duration::from_secs(STARTUP_TIMEOUT_SECS);
    while std::time::Instant::now() < deadline {
        if port_ready(port) {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    Err(format!(
        "sidecar did not start within {STARTUP_TIMEOUT_SECS} s"
    ))
}

// ---------------------------------------------------------------------------
// Sidecar helpers
// ---------------------------------------------------------------------------

/// Run `node <script>` as a one-shot command and wait for it to finish.
fn run_node_script(
    app: &tauri::AppHandle,
    script: &Path,
    db: &str,
) -> Result<(), String> {
    let sidecar = app
        .shell()
        .sidecar("dayflow-server")
        .map_err(|e| format!("sidecar not found: {e}"))?;

    let (mut rx, _child) = sidecar
        .args([script.to_str().unwrap()])
        .env("DATABASE_URL", db)
        .env("NODE_ENV", "production")
        .current_dir(server_dir(app))
        .spawn()
        .map_err(|e| format!("failed to spawn sidecar: {e}"))?;

    let deadline = std::time::Instant::now() + Duration::from_secs(MIGRATE_TIMEOUT_SECS);

    loop {
        if std::time::Instant::now() > deadline {
            return Err("migration timed out".into());
        }

        use tokio::sync::mpsc::error::TryRecvError;

        match rx.try_recv() {
            Ok(CommandEvent::Terminated(status)) => {
                if let Some(code) = status.code {
                    if code != 0 {
                        return Err(format!("script exited with code {code}"));
                    }
                }
                return Ok(());
            }
            Ok(CommandEvent::Stderr(line)) => {
                let text = String::from_utf8_lossy(&line);
                eprintln!("[migrate] {text}");
            }
            Ok(CommandEvent::Stdout(_)) => {}
            Ok(CommandEvent::Error(err)) => {
                eprintln!("[migrate] error: {err}");
            }
            Ok(other) => {
                eprintln!("[migrate] unhandled event: {other:?}");
            }
            Err(TryRecvError::Empty) => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(TryRecvError::Disconnected) => {
                return Ok(());
            }
        }
    }
}

/// Start the Next.js production server as a persistent sidecar.
fn spawn_server(app: &tauri::AppHandle) -> Result<(), String> {
    let dir = server_dir(app);
    let server_js = dir.join("server.js");

    if !server_js.exists() {
        // Dev mode — no bundled server; rely on beforeDevCommand
        return Ok(());
    }

    let db = db_url(app);

    // --- Run DB migration first (one-shot) ---
    let migrate_script = dir.join("scripts").join("migrate.mjs");
    if migrate_script.exists() {
        println!("[dayflow] Running DB migration...");
        run_node_script(app, &migrate_script, &db)?;
        println!("[dayflow] Migration complete.");
    } else {
        println!("[dayflow] No migration script found — skipping");
    }

    // --- Start Next.js server ---
    let sidecar = app
        .shell()
        .sidecar("dayflow-server")
        .map_err(|e| format!("sidecar not found: {e}"))?;

    let (_rx, _child) = sidecar
        .args([server_js.to_str().unwrap(), "--port", &SIDECAR_PORT.to_string()])
        .env("PORT", SIDECAR_PORT.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .env("NODE_ENV", "production")
        .env("DATABASE_URL", &db)
        .current_dir(dir)
        .spawn()
        .map_err(|e| format!("failed to spawn server: {e}"))?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Debug build (pnpm tauri dev) — skip sidecar.
            // CLI runs `beforeDevCommand: "pnpm dev"` → Next.js on :3000.
            // Tauri opens webview at devUrl automatically.
            // `tauri build` uses --release, so this block is excluded in release builds.
            if cfg!(debug_assertions) {
                println!("[dayflow] Dev mode — skipping sidecar setup");
                return Ok(());
            }

            spawn_server(app.handle())?;
            wait_for_port(SIDECAR_PORT)?;

            let url = format!("http://127.0.0.1:{SIDECAR_PORT}");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.navigate(url.parse().unwrap());
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
