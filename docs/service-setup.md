# Dayflow Service Setup

Dayflow runs as a **systemd user service** started by Caddy reverse proxy.

See [caddy-setup.md](caddy-setup.md) for the Caddy side.

## Architecture

```
system boot
  ├─ loginctl enable-linger → user manager starts at boot
  │   └─ dayflow.service (user) → next start → :25480
  └─ caddy.service (system) → port 80/443 → reverse_proxy 127.0.0.1:25480
```

## Service File

**Source**: `scripts/dayflow.service`
**Deployed to**: `~/.config/systemd/user/dayflow.service`

```ini
[Unit]
Description=Dayflow - Personal planning system
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/harozien/code/sandbox/creative/dayflow
ExecStart=/home/harozien/code/sandbox/creative/dayflow/node_modules/.bin/next start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=25480
Environment=HOSTNAME=127.0.0.1
Environment=DATABASE_URL=file:./data.db

[Install]
WantedBy=default.target
```

### Key details

| Field | Value | Why |
|-------|-------|-----|
| `Type=simple` | Immediate start | No fork, no notify — just runs `next start` |
| `PORT=25480` | Random high port | Avoids conflicts with common services |
| `HOSTNAME=127.0.0.1` | Local only | Dayflow listens on localhost — Caddy is the public-facing front door |
| `DATABASE_URL=file:./data.db` | SQLite file | Relative to WorkingDirectory (project root) |
| `Restart=on-failure` | Auto-recovery | Restarts if the process crashes or exits with error |
| `WantedBy=default.target` | User login start | Service starts when the user's systemd instance starts (via linger) |

## Boot Startup (Linger)

User services normally only run while the user is logged in. **Linger** tells systemd to start the user manager at boot, so Dayflow starts before login.

```bash
sudo loginctl enable-linger "$USER"
```

Check status:
```bash
loginctl show-user "$USER" | grep Linger
# → Linger=yes
```

## Commands

```bash
# Start
systemctl --user start dayflow

# Stop
systemctl --user stop dayflow

# Restart (after update)
systemctl --user restart dayflow

# Status
systemctl --user status dayflow

# Logs (follow)
journalctl --user -u dayflow -f

# Logs (last 100 lines)
journalctl --user -u dayflow -n 100 --no-pager
```

## Updating

```bash
bash scripts/update.sh
```

This runs: `git pull` → `pnpm install` → `pnpm build` → `node scripts/migrate.mjs` → `systemctl --user restart dayflow`.

## Fresh Install

```bash
bash scripts/install-service.sh
```

This runs the full setup: install deps, build, configure Caddy, add hosts entries, enable linger, enable service, start everything.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `http://dayflow.me` connection refused | Caddy not running | `sudo systemctl enable --now caddy` |
| Caddy `bind: address already in use` on :80 | Something else on port 80 | `sudo lsof -i :80` to find it, or `sudo systemctl stop dayflow` (old system service) |
| Dayflow won't start | Port 25480 in use or build missing | `ss -tlnp \| grep 25480` to check, or `pnpm build` |
| `dayflow.me` resolves to wrong IP | Missing `/etc/hosts` entry | Add `127.0.0.1 dayflow.me` and `::1 dayflow.me` to `/etc/hosts` |
| Browser SSL_ERROR | No HTTPS listener | Caddy config needs `tls internal` or `http://` prefix |
| Dayflow not starting on boot | Linger not enabled | `sudo loginctl enable-linger "$USER"` |
