use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::time::Duration;

use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

/// Port the Next.js server listens on.
const SIDECAR_PORT: u16 = 1420;

/// Max time to wait for the sidecar to boot.
///
/// Windows cold starts are slow: the sidecar is a plain node.exe running the
/// bundled Next.js standalone output (~35k files in node_modules), and
/// Windows Defender's real-time scanning of every module Node requires() can
/// push first launch past 30 s. Overridable via DAYFLOW_STARTUP_TIMEOUT_SECS.
const STARTUP_TIMEOUT_SECS: u64 = 60;

fn startup_timeout() -> Duration {
    let secs = std::env::var("DAYFLOW_STARTUP_TIMEOUT_SECS")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(STARTUP_TIMEOUT_SECS);
    Duration::from_secs(secs)
}

/// Max time to wait for migration to complete.
const MIGRATE_TIMEOUT_SECS: u64 = 60;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/// Bundled Next.js standalone server directory (inside the app resource dir).
fn server_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .resource_dir()
        .map(|dir| dir.join("server"))
        .map_err(|e| format!("failed to resolve resource dir: {e}"))
}

/// Writable app data directory — persists the SQLite DB across launches.
/// macOS:   ~/Library/Application Support/com.dayflow.app/
/// Windows: %APPDATA%/com.dayflow.app/
fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("failed to create app data dir {}: {e}", dir.display()))?;
    Ok(dir)
}

/// SQLite database URL for the sidecar.
fn db_url(app: &tauri::AppHandle) -> Result<String, String> {
    Ok(format!("file:{}", data_dir(app)?.join("data.db").display()))
}

// ---------------------------------------------------------------------------
// Startup error log
// ---------------------------------------------------------------------------

/// Append one line to the persistent startup error log, creating parent
/// directories as needed. Each entry is prefixed with a unix timestamp.
fn append_startup_log(path: &Path, message: &str) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_secs());
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)?;
    use std::io::Write;
    writeln!(file, "[{now}] {message}")?;
    Ok(())
}

/// Persistent startup error log path. Prefers the app data dir; falls back to
/// the temp dir when the app data path cannot be resolved.
fn startup_log_path(app: &tauri::AppHandle) -> PathBuf {
    match app.path().app_data_dir() {
        Ok(dir) => dir.join("logs").join("startup-error.log"),
        Err(_) => std::env::temp_dir().join("dayflow-startup-error.log"),
    }
}

// ---------------------------------------------------------------------------
// Health checks
// ---------------------------------------------------------------------------

/// True when the given TCP port is accepting connections.
fn port_ready(port: u16) -> bool {
    let addr = match format!("127.0.0.1:{port}").parse::<std::net::SocketAddr>() {
        Ok(addr) => addr,
        Err(_) => return false,
    };
    TcpStream::connect_timeout(&addr, Duration::from_millis(200)).is_ok()
}

fn wait_for_port(port: u16) -> Result<(), String> {
    let deadline = std::time::Instant::now() + startup_timeout();
    while std::time::Instant::now() < deadline {
        if port_ready(port) {
            return Ok(());
        }
        std::thread::sleep(Duration::from_millis(250));
    }
    Err(format!(
        "sidecar did not start within {} s",
        startup_timeout().as_secs()
    ))
}

// ---------------------------------------------------------------------------
// Sidecar helpers
// ---------------------------------------------------------------------------

/// Run `node <script>` as a one-shot command and wait for it to finish.
fn run_node_script(app: &tauri::AppHandle, script: &Path, db: &str) -> Result<(), String> {
    let sidecar = app
        .shell()
        .sidecar("dayflow-server")
        .map_err(|e| format!("sidecar not found: {e}"))?;

    let script_str = script
        .to_str()
        .ok_or_else(|| format!("script path is not valid UTF-8: {}", script.display()))?;

    let (mut rx, _child) = sidecar
        .args([script_str])
        .env("DATABASE_URL", db)
        .env("NODE_ENV", "production")
        .current_dir(server_dir(app)?)
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
    let dir = server_dir(app)?;
    let server_js = dir.join("server.js");

    if !server_js.exists() {
        // Dev mode — no bundled server; rely on beforeDevCommand
        return Ok(());
    }

    let db = db_url(app)?;

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

    let server_js_str = server_js
        .to_str()
        .ok_or_else(|| format!("server path is not valid UTF-8: {}", server_js.display()))?;

    let (mut rx, _child) = sidecar
        .args([server_js_str, "--port", &SIDECAR_PORT.to_string()])
        .env("PORT", SIDECAR_PORT.to_string())
        .env("HOSTNAME", "127.0.0.1")
        .env("NODE_ENV", "production")
        .env("DATABASE_URL", &db)
        .current_dir(dir)
        .spawn()
        .map_err(|e| format!("failed to spawn server: {e}"))?;

    // Drain the event stream so server output is not lost: write stderr to the
    // persistent startup log, otherwise a boot failure surfaces only as the
    // bare "did not start within N s" timeout with no hint of the real cause.
    let log_path = startup_log_path(app);
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line);
                    eprintln!("[server] {text}");
                    let _ = append_startup_log(&log_path, &format!("server stderr: {text}"));
                }
                CommandEvent::Terminated(status) => {
                    let _ = append_startup_log(&log_path, &format!("server terminated: {status:?}"));
                }
                _ => {}
            }
        }
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Debug build (pnpm tauri dev) — skip sidecar.
            // CLI runs `beforeDevCommand: "pnpm dev"` → Next.js on :3000.
            // Tauri opens webview at devUrl automatically.
            // `tauri build` uses --release, so this block is excluded in release builds.
            if cfg!(debug_assertions) {
                println!("[dayflow] Dev mode — skipping sidecar setup");
                return Ok(());
            }

            if let Err(err) = bootstrap(app.handle()) {
                let log_path = startup_log_path(app.handle());
                let _ = append_startup_log(&log_path, &err);
                let _ = app
                    .dialog()
                    .message(format!("{err}\n\nDiagnostic log: {}", log_path.display()))
                    .title("Dayflow failed to start")
                    .kind(MessageDialogKind::Error)
                    .blocking_show();
                std::process::exit(1);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Run the full startup sequence: migration, server spawn, port wait, navigation.
fn bootstrap(app: &tauri::AppHandle) -> Result<(), String> {
    spawn_server(app)?;
    wait_for_port(SIDECAR_PORT)?;

    let url = format!("http://127.0.0.1:{SIDECAR_PORT}");
    if let Some(window) = app.get_webview_window("main") {
        let parsed = url
            .parse::<tauri::Url>()
            .map_err(|e| format!("invalid navigation URL {url:?}: {e}"))?;
        window
            .navigate(parsed)
            .map_err(|e| format!("failed to navigate to {url}: {e}"))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn append_startup_log_creates_parents_and_appends() {
        let dir =
            std::env::temp_dir().join(format!("dayflow-startup-log-test-{}", std::process::id()));
        let log = dir.join("logs").join("startup-error.log");
        let _ = std::fs::remove_dir_all(&dir);

        append_startup_log(&log, "first failure").expect("first append should succeed");
        append_startup_log(&log, "second failure").expect("second append should succeed");

        let contents = std::fs::read_to_string(&log).expect("log should be readable");
        assert!(contents.contains("first failure"));
        assert!(contents.contains("second failure"));

        let _ = std::fs::remove_dir_all(&dir);
    }
}
