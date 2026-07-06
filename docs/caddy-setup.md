# Caddy Setup

Caddy reverse-proxies `dayflow.me` to the Dayflow Next.js app running on `127.0.0.1:25480`.

## Architecture

```
Browser → http://dayflow.me
         → :80 (Caddy, 301 redirect)
         → :443 (Caddy, TLS self-signed)
         → reverse_proxy 127.0.0.1:25480
         → Dayflow (Next.js, user service)
```

## Files

| File | Purpose |
|------|---------|
| `scripts/Caddyfile` | Source config — site blocks for Caddy |
| `/etc/caddy/conf.d/dayflow` | Deployed config — copied from source |
| `scripts/install-service.sh` | One-shot setup (copies config, enables Caddy) |

## Caddyfile

```caddy
dayflow.me {
    tls internal
    reverse_proxy 127.0.0.1:25480
}

dayflow {
    redir https://dayflow.me{uri}
}
```

- `dayflow.me` — serves the app with self-signed TLS. `tls internal` generates a local cert, no Let's Encrypt needed.
- `dayflow` — redirects to the canonical `dayflow.me` URL.
- The default Caddyfile at `/etc/caddy/Caddyfile` remains untouched. Our config sits in `/etc/caddy/conf.d/` and is auto-imported via `import /etc/caddy/conf.d/*`.

## Hosts File

`/etc/hosts` entries required for local resolution:

```
127.0.0.1 dayflow.me
::1       dayflow.me
127.0.0.1 dayflow
::1       dayflow
```

Without these, the browser resolves `dayflow.me` via DNS to the public internet instead of your machine.

## Commands

```bash
# Reload Caddy after config change
sudo systemctl reload caddy

# Restart
sudo systemctl restart caddy

# Status
sudo systemctl status caddy

# Logs
sudo journalctl -u caddy -f
```

## Ports

| Port | Service | Purpose |
|------|---------|---------|
| 80 | Caddy | HTTP (redirects to HTTPS) |
| 443 | Caddy | HTTPS (reverse proxy to app) |
| 25480 | Dayflow (user service) | Next.js app (127.0.0.1 only) |

## Browser Warning

The first time you visit `https://dayflow.me`, the browser shows a "Your connection is not private" warning. This is expected — the TLS certificate is self-signed since `dayflow.me` is not a public domain.

Click **Advanced → Proceed to dayflow.me (unsafe)** to bypass. The warning is shown once and cached per session.

## Update Flow

If the Caddyfile changes during a code update:

```bash
git pull
sudo cp scripts/Caddyfile /etc/caddy/conf.d/dayflow
sudo systemctl reload caddy
```

Otherwise just `bash scripts/update.sh` handles everything else.
