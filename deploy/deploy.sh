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

echo "==> [1/8] Installing system packages (nginx, python3, node 20, certbot, git)..."
CERTBOT_VIA_PIP=0
if [[ "$OS_FAMILY" == "debian" ]]; then
  apt-get update -y
  apt-get install -y nginx python3 python3-venv python3-pip git curl ufw
  if ! apt-get install -y certbot python3-certbot-nginx; then
    CERTBOT_VIA_PIP=1
  fi
  if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//;s/\..*//')" -lt 18 ]]; then
    echo "==> Installing Node.js 20.x via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
else
  $PKG install -y nginx python3 python3-pip git
  # Amazon Linux 2023 ships curl-minimal by default; installing the full
  # 'curl' package on top of it fails with a package conflict. curl-minimal
  # already provides the curl command, so only install curl if it's missing.
  command -v curl >/dev/null 2>&1 || $PKG install -y curl
  if ! $PKG install -y certbot python3-certbot-nginx; then
    CERTBOT_VIA_PIP=1
  fi
  if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//;s/\..*//')" -lt 18 ]]; then
    echo "==> Installing Node.js 20.x via NodeSource..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    $PKG install -y nodejs
  fi
fi
if [[ "$CERTBOT_VIA_PIP" == "1" ]]; then
  echo "    certbot package unavailable from the system repo — installing via pip instead."
  python3 -m pip install --upgrade pip
  python3 -m pip install certbot certbot-nginx
fi

echo "==> [2/8] Fetching the code..."
if [[ -d "$DEPLOY_PATH/.git" ]]; then
  sudo -u "$DEPLOY_USER" git -C "$DEPLOY_PATH" pull --ff-only
else
  mkdir -p "$(dirname "$DEPLOY_PATH")"
  sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$DEPLOY_PATH"
fi
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$DEPLOY_PATH"

echo "==> [3/8] Backend: virtualenv + dependencies..."
cd "$DEPLOY_PATH/backend"
if [[ ! -d venv ]]; then
  if ! sudo -u "$DEPLOY_USER" python3 -m venv venv; then
    echo "    python3 -m venv failed, falling back to the 'virtualenv' package..."
    python3 -m pip install --upgrade virtualenv
    sudo -u "$DEPLOY_USER" python3 -m virtualenv venv
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
sudo -u "$DEPLOY_USER" npm install
sudo -u "$DEPLOY_USER" npm run build

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
