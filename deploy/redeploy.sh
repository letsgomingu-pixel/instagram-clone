#!/usr/bin/env bash
# Fast redeploy for an already-provisioned server (after deploy.sh ran once).
# Used by GitHub Actions and for manual updates: git pull + build + migrate + restart.
#
#   sudo bash deploy/redeploy.sh
#
# Safe to re-run: does not touch backend/.env, database data, or uploaded media.

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/iamnotafishmonger}"
DEPLOY_USER="${SUDO_USER:-ec2-user}"
BACKEND_PORT="${BACKEND_PORT:-8001}"

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo: sudo bash deploy/redeploy.sh" >&2
  exit 1
fi

echo "==> Redeploying $DEPLOY_PATH as $DEPLOY_USER"

chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_PATH"
sudo -u "$DEPLOY_USER" git -C "$DEPLOY_PATH" fetch origin main
sudo -u "$DEPLOY_USER" git -C "$DEPLOY_PATH" reset --hard origin/main

echo "==> Backend: dependencies + Alembic migrations..."
cd "$DEPLOY_PATH/backend"
sudo -u "$DEPLOY_USER" venv/bin/pip install -q -r requirements.txt
sudo -u "$DEPLOY_USER" venv/bin/python -m alembic upgrade head

echo "==> Frontend: install + production build..."
cd "$DEPLOY_PATH/frontend"
sudo -u "$DEPLOY_USER" env PATH="/usr/local/bin:$PATH" npm install
sudo -u "$DEPLOY_USER" env PATH="/usr/local/bin:$PATH" npm run build

chmod o+rx "$(dirname "$DEPLOY_PATH")" "$DEPLOY_PATH" 2>/dev/null || true
find "$DEPLOY_PATH/frontend/dist" -type d -exec chmod o+rx {} + 2>/dev/null || true
find "$DEPLOY_PATH/frontend/dist" -type f -exec chmod o+r {} + 2>/dev/null || true

echo "==> Restarting services..."
systemctl restart instagram-backend
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/v1/health" >/dev/null; then
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "Backend health check failed — see: journalctl -u instagram-backend -n 50" >&2
    exit 1
  fi
  sleep 2
done
nginx -t
systemctl reload nginx

echo "[OK] Redeploy complete — $(git -C "$DEPLOY_PATH" rev-parse --short HEAD)"
