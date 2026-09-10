#!/usr/bin/env bash
# One-time production secrets setup on EC2.
# Creates /etc/instagram-production.env (chmod 600) and applies to backend/.env.
#
#   sudo bash deploy/setup-production-env.sh
#
# Gmail SMTP requires an app password (not your normal password):
#   https://myaccount.google.com/apppasswords

set -euo pipefail

PROD_ENV="/etc/instagram-production.env"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/iamnotafishmonger}"

echo "=== iamnotafishmonger.com 프로덕션 환경 설정 ==="
echo ""

read -r -p "Gmail 주소 (SMTP_USER) [letsgomingu@gmail.com]: " SMTP_USER
SMTP_USER="${SMTP_USER:-letsgomingu@gmail.com}"
read -r -s -p "Gmail 앱 비밀번호 (16자): " SMTP_PASSWORD
echo ""
read -r -p "발신 이메일 (EMAIL_FROM) [${SMTP_USER}]: " EMAIL_FROM
EMAIL_FROM="${EMAIL_FROM:-$SMTP_USER}"

echo ""
echo "--- PortOne (실결제) — 비우면 mock 결제 유지 ---"
read -r -p "PORTONE_STORE_ID: " PORTONE_STORE_ID
read -r -p "PORTONE_CHANNEL_KEY: " PORTONE_CHANNEL_KEY
read -r -s -p "PORTONE_API_SECRET: " PORTONE_API_SECRET
echo ""
read -r -s -p "PORTONE_WEBHOOK_SECRET: " PORTONE_WEBHOOK_SECRET
echo ""

cat > "$PROD_ENV" << EOF
FRONTEND_URL=https://iamnotafishmonger.com
EMAIL_FROM=${EMAIL_FROM}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
PORTONE_STORE_ID=${PORTONE_STORE_ID}
PORTONE_CHANNEL_KEY=${PORTONE_CHANNEL_KEY}
PORTONE_API_SECRET=${PORTONE_API_SECRET}
PORTONE_WEBHOOK_SECRET=${PORTONE_WEBHOOK_SECRET}
PORTONE_MOCK=$([ -n "$PORTONE_STORE_ID" ] && echo false || echo true)
EOF
chmod 600 "$PROD_ENV"
echo "[OK] Wrote $PROD_ENV"

if [[ -f "$DEPLOY_PATH/deploy/ensure-production-env.sh" ]]; then
  DEPLOY_PATH="$DEPLOY_PATH" bash "$DEPLOY_PATH/deploy/ensure-production-env.sh"
fi

if systemctl is-active --quiet instagram-backend 2>/dev/null; then
  systemctl restart instagram-backend
  echo "[OK] instagram-backend restarted"
fi

echo ""
echo "확인: curl -s http://127.0.0.1:8001/api/v1/health"
echo "  email_delivery_ready=true, payments_mock=false 이면 실서비스 준비 완료"
