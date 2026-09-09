#!/usr/bin/env bash
# Idempotently merge email settings into backend/.env (never prints secrets).
# Called from redeploy.sh / GitHub Actions when SMTP_* env vars are exported.

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/iamnotafishmonger}"
ENV_FILE="${ENV_FILE:-$DEPLOY_PATH/backend/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ensure-email-env] $ENV_FILE not found — skipping" >&2
  exit 0
fi

if [[ -z "${SMTP_USER:-}" || -z "${SMTP_PASSWORD:-}" ]]; then
  echo "[ensure-email-env] SMTP_USER/SMTP_PASSWORD not set — skipping email config" >&2
  exit 0
fi

export ENV_FILE
export EMAIL_FROM="${EMAIL_FROM:-$SMTP_USER}"
export FRONTEND_URL="${FRONTEND_URL:-https://iamnotafishmonger.com}"

python3 << 'PY'
import os
from pathlib import Path

env_file = Path(os.environ["ENV_FILE"])
updates = {
    "FRONTEND_URL": os.environ["FRONTEND_URL"],
    "EMAIL_ENABLED": "true",
    "EMAIL_FROM": os.environ["EMAIL_FROM"],
    "SMTP_HOST": "smtp.gmail.com",
    "SMTP_PORT": "587",
    "SMTP_USER": os.environ["SMTP_USER"],
    "SMTP_PASSWORD": os.environ["SMTP_PASSWORD"],
    "SMTP_USE_TLS": "true",
}

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
print(f"[ensure-email-env] Email settings updated in {env_file} (from={updates['EMAIL_FROM']})")
PY
