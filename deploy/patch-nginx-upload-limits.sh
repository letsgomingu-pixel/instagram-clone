#!/usr/bin/env bash
# Patch live nginx configs for large video uploads without overwriting certbot SSL.
# Installs a global http-level limit AND patches site-specific configs.

set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/iamnotafishmonger}"
DOMAIN="${DOMAIN:-iamnotafishmonger.com}"
GLOBAL_NAME="00-iamnotafishmonger-upload-limits.conf"
GLOBAL_SRC="$DEPLOY_PATH/deploy/nginx-upload-limits-global.conf"
GLOBAL_DST="/etc/nginx/conf.d/$GLOBAL_NAME"

if [[ -f "$GLOBAL_SRC" ]]; then
  cp "$GLOBAL_SRC" "$GLOBAL_DST"
  echo "[patch-nginx] Installed global upload limits -> $GLOBAL_DST"
else
  echo "[patch-nginx] WARNING: missing $GLOBAL_SRC" >&2
fi

python3 << PY
import re
from pathlib import Path

DOMAIN = "${DOMAIN}"
BACKEND = "127.0.0.1:8001"
BODY_LIMIT = "client_max_body_size 200M;"
TIMEOUT_DIRECTIVES = (
    "proxy_read_timeout 300s;",
    "proxy_send_timeout 300s;",
    "client_body_timeout 300s;",
)

search_dirs = [
    Path("/etc/nginx/sites-enabled"),
    Path("/etc/nginx/sites-available"),
    Path("/etc/nginx/conf.d"),
]

files: list[Path] = []
seen: set[Path] = set()
for directory in search_dirs:
    if not directory.is_dir():
        continue
    for path in sorted(directory.iterdir()):
        if not path.is_file() or path in seen:
            continue
        if path.name == "${GLOBAL_NAME}":
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if DOMAIN not in text and BACKEND not in text:
            continue
        seen.add(path)
        files.append(path)

if not files:
    print(f"[patch-nginx] No site-specific nginx config matched — global limits only")
    raise SystemExit(0)

changed_any = False
for path in files:
    text = path.read_text(encoding="utf-8")
    original = text

    text = re.sub(r"client_max_body_size\s+[^;]+;", BODY_LIMIT, text)

    if BODY_LIMIT not in text:
        text = re.sub(
            r"(server\s*\{)",
            rf"\1\n    {BODY_LIMIT}",
            text,
        )

    def patch_proxy_block(match: re.Match[str]) -> str:
        block = match.group(0)
        if BACKEND not in block:
            return block
        if BODY_LIMIT.split()[0] not in block:
            block = block.replace("{", "{\n        " + BODY_LIMIT, 1)
        anchor = "proxy_set_header X-Forwarded-Proto $scheme;"
        if anchor in block:
            for directive in TIMEOUT_DIRECTIVES:
                key = directive.split()[0]
                if key not in block:
                    block = block.replace(
                        anchor,
                        anchor + "\n        " + directive,
                    )
        return block

    text = re.sub(
        r"location[^{]+\{.*?\n    \}",
        patch_proxy_block,
        text,
        flags=re.DOTALL,
    )

    if text != original:
        path.write_text(text, encoding="utf-8")
        changed_any = True
        print(f"[patch-nginx] Updated {path}")

if changed_any:
    print("[patch-nginx] Site configs patched (200M + 300s timeouts)")
else:
    print("[patch-nginx] Site configs already up to date")
PY
