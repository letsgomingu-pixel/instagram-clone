#!/usr/bin/env bash
# Patch nginx for large video uploads (certbot-safe). Runs on every redeploy as root.

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/iamnotafishmonger}"
DOMAIN="${DOMAIN:-iamnotafishmonger.com}"
GLOBAL_NAME="00-iamnotafishmonger-upload-limits.conf"
GLOBAL_SRC="$DEPLOY_PATH/deploy/nginx-upload-limits-global.conf"
GLOBAL_DST="/etc/nginx/conf.d/$GLOBAL_NAME"
NGINX_MAIN="/etc/nginx/nginx.conf"
BODY_LIMIT="client_max_body_size 200M;"

echo "[patch-nginx] Applying upload limits (200M)..."

if [[ -f "$GLOBAL_SRC" ]]; then
  cp "$GLOBAL_SRC" "$GLOBAL_DST"
  echo "[patch-nginx] Installed $GLOBAL_DST"
fi

python3 << 'PY'
import re
from pathlib import Path

DOMAIN = "iamnotafishmonger.com"
BACKEND = "127.0.0.1:8001"
BODY_LIMIT = "client_max_body_size 200M;"
TIMEOUTS = (
    "client_body_timeout 300s;",
    "proxy_read_timeout 300s;",
    "proxy_send_timeout 300s;",
)
NGINX_MAIN = Path("/etc/nginx/nginx.conf")

def upsert_body_limit(text: str) -> str:
    if "client_max_body_size" in text:
        return re.sub(r"client_max_body_size\s+[^;]+;", BODY_LIMIT, text)
    return text

def ensure_http_limits(text: str) -> str:
    text = upsert_body_limit(text)
    if BODY_LIMIT in text:
        return text
    return re.sub(
        r"http\s*\{",
        "http {\n    " + BODY_LIMIT + "\n    client_body_timeout 300s;",
        text,
        count=1,
    )

def patch_site_file(path: Path) -> bool:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return False
    original = text
    text = upsert_body_limit(text)
    if BODY_LIMIT not in text:
        text = re.sub(r"(server\s*\{)", r"\1\n    " + BODY_LIMIT, text)

    def patch_location(block: re.Match[str]) -> str:
        chunk = block.group(0)
        if BACKEND not in chunk and "/api" not in chunk:
            return chunk
        chunk = upsert_body_limit(chunk)
        if "proxy_set_header X-Forwarded-Proto $scheme;" in chunk:
            for directive in TIMEOUTS:
                key = directive.split()[0]
                if key not in chunk:
                    chunk = chunk.replace(
                        "proxy_set_header X-Forwarded-Proto $scheme;",
                        "proxy_set_header X-Forwarded-Proto $scheme;\n        " + directive,
                    )
        return chunk

    text = re.sub(r"location[^{]+\{.*?\n    \}", patch_location, text, flags=re.DOTALL)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"[patch-nginx] Updated {path}")
        return True
    return False

changed = False
if NGINX_MAIN.is_file():
    main_text = NGINX_MAIN.read_text(encoding="utf-8")
    updated = ensure_http_limits(main_text)
    if updated != main_text:
        NGINX_MAIN.write_text(updated, encoding="utf-8")
        print(f"[patch-nginx] Updated {NGINX_MAIN}")
        changed = True

search_roots = [Path("/etc/nginx/sites-enabled"), Path("/etc/nginx/sites-available"), Path("/etc/nginx/conf.d")]
seen: set[Path] = set()
for root in search_roots:
    if not root.is_dir():
        continue
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path in seen:
            continue
        if path.name == "00-iamnotafishmonger-upload-limits.conf":
            seen.add(path)
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if DOMAIN not in content and BACKEND not in content and "/api" not in content:
            continue
        seen.add(path)
        if patch_site_file(path):
            changed = True

if not changed:
    print("[patch-nginx] Site configs unchanged (http-level limit applied)")
PY

nginx -t

if ! grep -rq "client_max_body_size 200M" /etc/nginx/; then
  echo "[patch-nginx] ERROR: client_max_body_size 200M not found in /etc/nginx after patch" >&2
  exit 1
fi

echo "[patch-nginx] Verified client_max_body_size 200M in nginx config"
