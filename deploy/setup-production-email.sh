#!/usr/bin/env bash
# One-time: configure Gmail SMTP for password-reset emails on the live server.
# Run ON EC2 (Instance Connect / SSH):
#   sudo bash deploy/setup-production-email.sh
#
# Uses /etc/instagram-smtp.env (chmod 600) — not committed to git.
# Gmail requires an **app password** (not your normal Gmail password):
#   https://myaccount.google.com/apppasswords

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/iamnotafishmonger}"
SMTP_ENV="/etc/instagram-smtp.env"

read -r -p "Gmail address [letsgomingu@gmail.com]: " SMTP_USER
SMTP_USER="${SMTP_USER:-letsgomingu@gmail.com}"
read -r -s -p "Gmail app password (16 chars, no spaces): " SMTP_PASSWORD
echo
read -r -p "From address [${SMTP_USER}]: " EMAIL_FROM
EMAIL_FROM="${EMAIL_FROM:-$SMTP_USER}"

cat > "$SMTP_ENV" << EOF
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
EMAIL_FROM=${EMAIL_FROM}
FRONTEND_URL=https://iamnotafishmonger.com
EOF
chmod 600 "$SMTP_ENV"
echo "[OK] Wrote $SMTP_ENV"

if [[ -f "$DEPLOY_PATH/deploy/ensure-email-env.sh" ]]; then
  DEPLOY_PATH="$DEPLOY_PATH" bash "$DEPLOY_PATH/deploy/ensure-email-env.sh"
fi

if systemctl is-active --quiet instagram-backend 2>/dev/null; then
  systemctl restart instagram-backend
  echo "[OK] instagram-backend restarted"
elif command -v pm2 >/dev/null 2>&1; then
  pm2 restart all
  echo "[OK] pm2 restarted"
fi

echo "Done. Test: https://iamnotafishmonger.com/forgot-password"
