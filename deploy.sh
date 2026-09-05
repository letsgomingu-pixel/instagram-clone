#!/usr/bin/env bash
# PM2 routine deploy — run on the EC2 server (also invoked by GitHub Actions).
#
#   cd /var/www/iamnotafishmonger && bash deploy.sh
#
# Requires: git, python3 venv in backend/venv, pm2, alembic (via requirements.txt)

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/iamnotafishmonger}"
BACKEND_DIR="$APP_DIR/backend"

log() { echo "[deploy] $*"; }
fail() { echo "[deploy] ERROR: $*" >&2; exit 1; }

[[ -d "$APP_DIR/.git" ]] || fail "Not a git repo: $APP_DIR"

cd "$APP_DIR"

log "git pull origin main"
git fetch origin main
git reset --hard origin/main

[[ -d "$BACKEND_DIR" ]] || fail "backend directory not found"

log "pip install -r backend/requirements.txt"
if [[ ! -d "$BACKEND_DIR/venv" ]]; then
  log "creating Python venv..."
  python3 -m venv "$BACKEND_DIR/venv"
fi
"$BACKEND_DIR/venv/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"

log "alembic upgrade head"
cd "$BACKEND_DIR"
./venv/bin/python -m alembic upgrade head

if [[ -d "$APP_DIR/frontend/package.json" || -f "$APP_DIR/frontend/package.json" ]]; then
  log "frontend npm install + build"
  cd "$APP_DIR/frontend"
  env PATH="/usr/local/bin:$PATH" npm install
  env PATH="/usr/local/bin:$PATH" npm run build
fi

log "restarting services"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart all
elif [[ -f /etc/systemd/system/instagram-backend.service ]]; then
  sudo systemctl restart instagram-backend
  sudo nginx -t
  sudo systemctl reload nginx
else
  fail "Neither pm2 nor instagram-backend.service found"
fi

log "done — $(git -C "$APP_DIR" rev-parse --short HEAD)"
