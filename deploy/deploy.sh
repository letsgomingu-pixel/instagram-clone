#!/usr/bin/env bash
# One-shot deploy/redeploy script for iamnotafishmonger.com.
# Supports Debian/Ubuntu (apt-get) and Amazon Linux/RHEL/CentOS (dnf or yum).
#
# Run this ON THE SERVER (not here), as a user with sudo rights:
#   sudo bash deploy.sh
#
# Safe to re-run: it skips steps that are already done and only overwrites
# generated config files, never your database or media uploads. Re-run it
# any time you `git pull` new code to rebuild and restart the services.

set -euo pipefail

# ---- Settings you may want to edit -----------------------------------
DOMAIN="iamnotafishmonger.com"
WWW_DOMAIN="www.iamnotafishmonger.com"
REPO_URL="https://github.com/letsgomingu-pixel/instagram-clone.git"
DEPLOY_PATH="/var/www/iamnotafishmonger"
BACKEND_PORT=8001
# The Linux user that will own the files and run the backend service.
# Defaults to whoever invoked sudo; falls back to root if run directly as root.
DEPLOY_USER="${SUDO_USER:-root}"
# ------------------------------------------------------------------------

if [[ $EUID -ne 0 ]]; then
  echo "Please run with sudo: sudo bash deploy.sh" >&2
  exit 1
fi

echo "==> Deploying as system user: $DEPLOY_USER"
echo "==> Target path: $DEPLOY_PATH"

# ---- detect OS family / package manager --------------------------------
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
echo "==> Detected OS family: $OS_FAMILY"

echo "==> [1/8] Installing system packages (nginx, python3, certbot, git)..."
CERTBOT_VIA_PIP=0
if [[ "$OS_FAMILY" == "debian" ]]; then
  apt-get update -y
  apt-get install -y nginx python3 python3-venv python3-pip git curl ufw
  if ! apt-get install -y certbot python3-certbot-nginx; then
    CERTBOT_VIA_PIP=1
  fi
else
  $PKG install -y nginx python3 python3-pip git
  # Amazon Linux 2023 ships curl-minimal by default; installing the full
  # 'curl' package on top of it fails with a package conflict. curl-minimal
  # already provides the curl command, so only install curl if it's missing.
  command -v curl >/dev/null 2>&1 || $PKG install -y curl
  # Some Python deps (bcrypt, cryptography, Pillow) fall back to compiling
  # from source if no prebuilt wheel matches this Python/arch. Have a
  # compiler ready so that doesn't hard-fail; harmless if wheels are used.
  $PKG install -y gcc python3-devel libffi-devel openssl-devel || true
  if ! $PKG install -y certbot python3-certbot-nginx; then
    CERTBOT_VIA_PIP=1
  fi
fi
if [[ "$CERTBOT_VIA_PIP" == "1" ]]; then
  echo "    certbot package unavailable from the system repo — installing via pip instead."
  python3 -m pip install --upgrade pip
  python3 -m pip install certbot certbot-nginx
fi

# ---- Node.js: install the official binary directly into /usr/local -----
# This project's frontend build tooling (Vite 8 / rolldown) needs Node
# >=20.19 or >=22.12 — newer than what distro package managers ship, and
# NodeSource's setup scripts are unreliable on Amazon Linux 2023 (its own
# 'nodejs' module stream can silently win and install an old v18 instead).
# A plain tarball from nodejs.org sidesteps all of that and works the same
# way on every distro. Node is only needed here to build the frontend once;
# the running site doesn't need it at all.
NODE_MIN_MAJOR=20
NODE_CURRENT_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_CURRENT_MAJOR="$(node -v | sed 's/^v//; s/\..*//')"
fi
if [[ "$NODE_CURRENT_MAJOR" -lt "$NODE_MIN_MAJOR" ]]; then
  echo "==> Installing a current Node.js LTS build from nodejs.org (found: ${NODE_CURRENT_MAJOR:-none})..."
  NODE_FILENAME="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/ | grep -oE 'node-v22\.[0-9]+\.[0-9]+-linux-x64\.tar\.xz' | head -1)"
  if [[ -z "$NODE_FILENAME" ]]; then
    echo "Could not determine the latest Node 22.x release from nodejs.org." >&2
    exit 1
  fi
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/${NODE_FILENAME}" -o /tmp/node.tar.xz
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
  rm -f /tmp/node.tar.xz
  hash -r
  echo "    Installed $(node -v) to /usr/local/bin"
fi

# ---- Python: find (or install) an interpreter that's actually new enough --
# The app uses `Mapped[str | None]`-style annotations (PEP 604), which crash
# at import time on Python < 3.10 with "unsupported operand type(s) for |:
# 'type' and 'NoneType'". Amazon Linux 2023's default `python3` is 3.9, so
# don't just assume `python3` is good enough — find one that qualifies, or
# install one, and use that exact interpreter for the venv.
PYTHON_BIN=""
for cand in python3.12 python3.11 python3.10 python3; do
  if command -v "$cand" >/dev/null 2>&1; then
    ver="$("$cand" -c 'import sys; print(sys.version_info[0]*100+sys.version_info[1])' 2>/dev/null || echo 0)"
    if [[ "$ver" -ge 310 ]]; then
      PYTHON_BIN="$cand"
      break
    fi
  fi
done
if [[ -z "$PYTHON_BIN" ]]; then
  echo "==> No Python >=3.10 found — installing python3.11..."
  if [[ "$OS_FAMILY" == "debian" ]]; then
    apt-get install -y python3.11 python3.11-venv || true
  else
    $PKG install -y python3.11 python3.11-pip || true
  fi
  command -v python3.11 >/dev/null 2>&1 && PYTHON_BIN=python3.11
fi
if [[ -z "$PYTHON_BIN" ]]; then
  echo "Could not find or install a Python 3.10+ interpreter — the app needs one." >&2
  exit 1
fi
echo "==> Using $("$PYTHON_BIN" --version) ($(command -v "$PYTHON_BIN")) for the backend venv"

echo "==> [2/8] Fetching the code..."
if [[ -d "$DEPLOY_PATH/.git" ]]; then
  # Fix ownership FIRST if the repo was originally created with a plain
  # `sudo git clone` (owned by root) — otherwise `sudo -u $DEPLOY_USER git
  # pull` fails with a permission error, and modern git also refuses to
  # touch a repo owned by a different user ("dubious ownership").
  chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_PATH"
  sudo -u "$DEPLOY_USER" git -C "$DEPLOY_PATH" pull --ff-only
else
  mkdir -p "$(dirname "$DEPLOY_PATH")"
  sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$DEPLOY_PATH"
fi
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_PATH"

echo "==> [3/8] Backend: virtualenv + dependencies..."
cd "$DEPLOY_PATH/backend"
if [[ -d venv ]]; then
  EXISTING_VER="$(venv/bin/python -c 'import sys; print(sys.version_info[0]*100+sys.version_info[1])' 2>/dev/null || echo 0)"
  if [[ "$EXISTING_VER" -lt 310 ]]; then
    echo "    Existing venv was built with a Python <3.10 (crashes on this app's"
    echo "    'X | None' type hints) — deleting it so it gets rebuilt with $PYTHON_BIN."
    rm -rf venv
  fi
fi
if [[ ! -d venv ]]; then
  if ! sudo -u "$DEPLOY_USER" "$PYTHON_BIN" -m venv venv; then
    echo "    $PYTHON_BIN -m venv failed, falling back to the 'virtualenv' package..."
    "$PYTHON_BIN" -m pip install --upgrade virtualenv
    sudo -u "$DEPLOY_USER" "$PYTHON_BIN" -m virtualenv venv
  fi
fi
sudo -u "$DEPLOY_USER" venv/bin/pip install --upgrade pip
sudo -u "$DEPLOY_USER" venv/bin/pip install -r requirements.txt

echo "==> [4/8] Backend: production .env..."
if [[ ! -f .env ]]; then
  sudo -u "$DEPLOY_USER" cp .env.production.example .env
  GENERATED_SECRET="$(openssl rand -hex 32)"
  sudo -u "$DEPLOY_USER" sed -i "s#^SECRET_KEY=.*#SECRET_KEY=${GENERATED_SECRET}#" .env
  echo "    Generated a fresh SECRET_KEY and wrote backend/.env"
else
  echo "    backend/.env already exists — leaving it untouched."
  echo "    (Check it still has SEED_DEMO_USERS=false and the right ALLOWED_ORIGINS.)"
fi

echo "==> [5/8] Frontend: install + production build..."
cd "$DEPLOY_PATH/frontend"
# Force /usr/local/bin first on PATH so the Node we just installed there is
# what runs, even if an older distro-packaged node also sits on /usr/bin.
sudo -u "$DEPLOY_USER" env PATH="/usr/local/bin:$PATH" npm install
sudo -u "$DEPLOY_USER" env PATH="/usr/local/bin:$PATH" npm run build

echo "==> [6/8] systemd service for the backend..."
sed \
  -e "s#__DEPLOY_USER__#${DEPLOY_USER}#g" \
  -e "s#__DEPLOY_PATH__#${DEPLOY_PATH}#g" \
  "$DEPLOY_PATH/deploy/instagram-backend.service" > /etc/systemd/system/instagram-backend.service
systemctl daemon-reload
systemctl enable instagram-backend
systemctl restart instagram-backend
sleep 1
systemctl --no-pager --full status instagram-backend | head -n 8

# nginx runs as its own system user (nginx/www-data), not $DEPLOY_USER, and
# only has "other" permission bits to go on. A restrictive umask on the
# account that ran git clone/npm build can leave files unreadable to it —
# that shows up as nginx logging "rewrite or internal redirection cycle"
# while trying to serve /index.html. Make sure the served tree is at least
# world-readable/traversable no matter what umask created it.
chmod o+rx "$(dirname "$DEPLOY_PATH")" "$DEPLOY_PATH" 2>/dev/null || true
find "$DEPLOY_PATH/frontend/dist" -type d -exec chmod o+rx {} + 2>/dev/null || true
find "$DEPLOY_PATH/frontend/dist" -type f -exec chmod o+r {} + 2>/dev/null || true

echo "==> [7/8] nginx site config..."
if [[ "$OS_FAMILY" == "debian" ]]; then
  mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
  cp "$DEPLOY_PATH/deploy/nginx.iamnotafishmonger.conf" "/etc/nginx/sites-available/${DOMAIN}"
  ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
  [[ -e /etc/nginx/sites-enabled/default ]] && rm -f /etc/nginx/sites-enabled/default
else
  # Amazon Linux / RHEL nginx has no sites-available convention — nginx.conf
  # already includes /etc/nginx/conf.d/*.conf, so drop the site config there.
  mkdir -p /etc/nginx/conf.d
  cp "$DEPLOY_PATH/deploy/nginx.iamnotafishmonger.conf" "/etc/nginx/conf.d/${DOMAIN}.conf"
fi
nginx -t
systemctl enable nginx
systemctl restart nginx

# SELinux (enforcing on some RHEL/Amazon Linux images) blocks nginx from
# proxying to the backend unless this boolean is allowed.
if command -v getenforce >/dev/null 2>&1 && [[ "$(getenforce)" == "Enforcing" ]]; then
  echo "    SELinux is enforcing — allowing nginx to reach the backend over the network..."
  setsebool -P httpd_can_network_connect 1 2>/dev/null || true
fi

echo "==> [8/8] Firewall..."
if [[ "$OS_FAMILY" == "debian" ]]; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
elif systemctl is-active --quiet firewalld 2>/dev/null; then
  firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
  firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
else
  echo "    No local firewall active (normal on a default Amazon Linux AMI) —"
  echo "    filtering relies entirely on the AWS Security Group, see below."
fi

cat <<EOF

============================================================
Backend & frontend are deployed and running over plain HTTP.

IMPORTANT — this is an AWS EC2 host. The local firewall is not enough:
also open inbound TCP 80 and 443 (source 0.0.0.0/0) in the instance's
Security Group in the AWS console, or the site will be unreachable
from outside no matter how correctly everything above ran.

Next step — HTTPS (run once DNS + port 80 are confirmed reachable
from outside):

    sudo certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN} \\
        --agree-tos -m YOUR_EMAIL@example.com --redirect

Useful commands:
  sudo systemctl status instagram-backend   # backend health
  sudo journalctl -u instagram-backend -f   # backend logs (live)
  sudo nginx -t && sudo systemctl reload nginx   # after editing nginx config
============================================================
EOF
