#!/usr/bin/env bash
# One-time PostgreSQL setup, self-hosted on this same server (no extra AWS
# cost, unlike RDS). Run once:
#   sudo bash deploy/setup-postgres.sh
#
# Safe to re-run: it won't touch the DB user's password if the role already
# exists, and won't recreate the database if it's already there.
#
# After it finishes, follow the printed instructions: put the DATABASE_URL
# it prints into backend/.env, run the Alembic migration, restart the
# backend service. See deploy/POSTGRES_AND_S3.md for the full picture.

set -euo pipefail

DB_NAME="instagram"
DB_USER="instagram"

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo: sudo bash deploy/setup-postgres.sh" >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  OS_FAMILY="debian"
elif command -v dnf >/dev/null 2>&1; then
  OS_FAMILY="rhel"; PKG=dnf
elif command -v yum >/dev/null 2>&1; then
  OS_FAMILY="rhel"; PKG=yum
else
  echo "Unsupported OS: no apt-get, dnf, or yum found." >&2
  exit 1
fi

echo "==> [1/4] Installing PostgreSQL..."
if [[ "$OS_FAMILY" == "debian" ]]; then
  apt-get update -y
  apt-get install -y postgresql postgresql-contrib
else
  $PKG install -y postgresql15-server postgresql15 2>/dev/null \
    || $PKG install -y postgresql16-server postgresql16
  PGDATA_DIR="$(find /var/lib/pgsql -maxdepth 2 -name data -type d 2>/dev/null | head -1)"
  PGDATA_DIR="${PGDATA_DIR:-/var/lib/pgsql/data}"
  if [[ ! -f "$PGDATA_DIR/PG_VERSION" ]]; then
    (postgresql-setup --initdb 2>&1) || (/usr/bin/postgresql-setup --initdb 2>&1) || true
  fi
fi

echo "==> [2/4] Starting PostgreSQL..."
PG_SERVICE=""
for svc in postgresql postgresql-15 postgresql-16 postgresql15 postgresql16; do
  if systemctl list-unit-files 2>/dev/null | grep -qi "^${svc}\.service"; then
    PG_SERVICE="$svc"
    break
  fi
done
if [[ -z "$PG_SERVICE" ]]; then
  # Amazon Linux 2023's postgresql15-server package doesn't ship a systemd
  # unit at all (pg_ctl/postgresql-setup exist, but nothing wires them into
  # systemd) — write a minimal one ourselves instead of guessing OS-provided
  # names further.
  echo "    No packaged systemd service found for PostgreSQL — writing one."
  if ! id postgres >/dev/null 2>&1; then
    echo "System user 'postgres' doesn't exist — something about the install is unexpected." >&2
    echo "Run 'rpm -qa | grep -i postgres' and share the output." >&2
    exit 1
  fi
  PG_BIN_DIR="$(dirname "$(command -v pg_ctl)")"
  PGDATA_DIR="$(find /var/lib/pgsql -maxdepth 2 -name PG_VERSION 2>/dev/null | head -1 | xargs -r dirname)"
  PGDATA_DIR="${PGDATA_DIR:-/var/lib/pgsql/data}"
  cat > /etc/systemd/system/postgresql.service <<UNIT
[Unit]
Description=PostgreSQL database server
After=network.target

[Service]
Type=forking
User=postgres
Environment=PGDATA=${PGDATA_DIR}
ExecStart=${PG_BIN_DIR}/pg_ctl start -D \${PGDATA} -s -w -t 300
ExecStop=${PG_BIN_DIR}/pg_ctl stop -D \${PGDATA} -s -m fast
ExecReload=${PG_BIN_DIR}/pg_ctl reload -D \${PGDATA} -s
TimeoutSec=300

[Install]
WantedBy=multi-user.target
UNIT
  systemctl daemon-reload
  PG_SERVICE="postgresql"
fi
systemctl enable --now "$PG_SERVICE"
echo "    Using service: $PG_SERVICE"

echo "==> [3/4] Allowing password auth for local TCP connections..."
# A freshly-initialized pg_hba.conf usually defaults host connections on
# 127.0.0.1/::1 to 'ident' auth, which needs an identd daemon nothing here
# runs — connecting with a password would fail with "ident authentication
# failed" until this is switched to md5/password auth.
PG_HBA="$(find /var/lib/pgsql /etc/postgresql -maxdepth 4 -name pg_hba.conf 2>/dev/null | head -1)"
if [[ -n "$PG_HBA" ]]; then
  cp "$PG_HBA" "${PG_HBA}.bak.$(date +%s)"
  sed -i -E 's/^(host[[:space:]]+all[[:space:]]+all[[:space:]]+127\.0\.0\.1\/32[[:space:]]+)ident/\1md5/' "$PG_HBA"
  sed -i -E 's/^(host[[:space:]]+all[[:space:]]+all[[:space:]]+::1\/128[[:space:]]+)ident/\1md5/' "$PG_HBA"
  systemctl reload "$PG_SERVICE" 2>/dev/null || systemctl restart "$PG_SERVICE"
else
  echo "    Could not locate pg_hba.conf — if the app can't authenticate later," >&2
  echo "    find it and change 'ident' to 'md5' for the 127.0.0.1/::1 host lines." >&2
fi

echo "==> [4/4] Creating role and database (idempotent)..."
ROLE_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" 2>/dev/null || true)"
NEW_PASSWORD=""
if [[ "$ROLE_EXISTS" != "1" ]]; then
  NEW_PASSWORD="$(openssl rand -hex 16)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${NEW_PASSWORD}';"
else
  echo "    Role '${DB_USER}' already exists — leaving its password as-is."
fi

DB_EXISTS="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" 2>/dev/null || true)"
if [[ "$DB_EXISTS" != "1" ]]; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
else
  echo "    Database '${DB_NAME}' already exists."
fi

echo
echo "============================================================"
if [[ -n "$NEW_PASSWORD" ]]; then
  echo "PostgreSQL is ready. Put this in backend/.env (replace the existing"
  echo "DATABASE_URL line), then SAVE THE PASSWORD — it is not shown again:"
  echo
  echo "DATABASE_URL=postgresql+psycopg2://${DB_USER}:${NEW_PASSWORD}@localhost:5432/${DB_NAME}"
else
  echo "PostgreSQL role/database already existed — reuse the DATABASE_URL"
  echo "you saved the first time this script ran."
fi
cat <<'EOF'

Next steps:
  cd /var/www/iamnotafishmonger/backend
  # edit .env with the DATABASE_URL above, then:
  sudo -u ec2-user venv/bin/python -m pip install -r requirements.txt
  sudo -u ec2-user venv/bin/python -m alembic upgrade head
  sudo systemctl restart instagram-backend
  sudo systemctl status instagram-backend
============================================================
EOF
