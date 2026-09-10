#!/usr/bin/env bash
# Merge production secrets into backend/.env (never prints secret values).
# Sources (in order):
#   1. /etc/instagram-production.env  (optional, chmod 600)
#   2. /etc/instagram-smtp.env        (legacy email-only file)
#   3. Environment variables exported by GitHub Actions / manual deploy

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/iamnotafishmonger}"
ENV_FILE="${ENV_FILE:-$DEPLOY_PATH/backend/.env}"

for extra in /etc/instagram-production.env /etc/instagram-smtp.env; do
  if [[ -f "$extra" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$extra"
    set +a
  fi
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ensure-production-env] $ENV_FILE not found — skipping" >&2
  exit 0
fi

export ENV_FILE
export FRONTEND_URL="${FRONTEND_URL:-https://iamnotafishmonger.com}"

python3 << 'PY'
import os
from pathlib import Path

env_file = Path(os.environ["ENV_FILE"])
updates: dict[str, str] = {
    "FRONTEND_URL": os.environ.get("FRONTEND_URL", "https://iamnotafishmonger.com"),
    "SEED_DEMO_USERS": "false",
    "EMAIL_ENABLED": "true",
}

# Email — Resend takes priority when set
resend = os.environ.get("RESEND_API_KEY", "").strip()
if resend:
    updates["RESEND_API_KEY"] = resend
    updates["EMAIL_FROM"] = os.environ.get("EMAIL_FROM", "noreply@iamnotafishmonger.com")

smtp_user = os.environ.get("SMTP_USER", "").strip()
smtp_password = os.environ.get("SMTP_PASSWORD", "").strip()
if smtp_user and smtp_password:
    updates["EMAIL_FROM"] = os.environ.get("EMAIL_FROM", smtp_user)
    updates["SMTP_HOST"] = "smtp.gmail.com"
    updates["SMTP_PORT"] = "587"
    updates["SMTP_USER"] = smtp_user
    updates["SMTP_PASSWORD"] = smtp_password
    updates["SMTP_USE_TLS"] = "true"

# PortOne — live payments when all keys present
portone_keys = {
    "PORTONE_STORE_ID": os.environ.get("PORTONE_STORE_ID", "").strip(),
    "PORTONE_CHANNEL_KEY": os.environ.get("PORTONE_CHANNEL_KEY", "").strip(),
    "PORTONE_API_SECRET": os.environ.get("PORTONE_API_SECRET", "").strip(),
    "PORTONE_WEBHOOK_SECRET": os.environ.get("PORTONE_WEBHOOK_SECRET", "").strip(),
}
if all(portone_keys.values()):
    updates.update(portone_keys)
    updates["PORTONE_MOCK"] = os.environ.get("PORTONE_MOCK", "false")
elif os.environ.get("PORTONE_MOCK", "").strip():
    updates["PORTONE_MOCK"] = os.environ["PORTONE_MOCK"].strip()

lines = env_file.read_text(encoding="utf-8").splitlines() if env_file.exists() else []
out: list[str] = []
seen: set[str] = set()

for line in lines:
    if not line or line.lstrip().startswith("#") or "=" not in line:
        out.append(line)
        continue
    key, _, _ = line.partition("=")
    if key in updates:
        out.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        out.append(line)

for key, value in updates.items():
    if key not in seen:
        out.append(f"{key}={value}")

env_file.write_text("\n".join(out) + "\n", encoding="utf-8")

flags = []
if resend or (smtp_user and smtp_password):
    flags.append("email=on")
else:
    flags.append("email=off")
if all(portone_keys.values()) and updates.get("PORTONE_MOCK", "false").lower() == "false":
    flags.append("payments=live")
else:
    flags.append("payments=mock")
print(f"[ensure-production-env] Updated {env_file} ({', '.join(flags)})")
PY
