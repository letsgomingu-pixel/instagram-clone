#!/usr/bin/env bash
# Patch live nginx configs for large video uploads without overwriting certbot SSL.
# Safe to run on every redeploy — updates client_max_body_size and API proxy timeouts.

set -euo pipefail

DOMAIN="${DOMAIN:-iamnotafishmonger.com}"

python3 << PY
import re
from pathlib import Path

DOMAIN = "${DOMAIN}"
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
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if DOMAIN not in text:
            continue
        seen.add(path)
        files.append(path)

if not files:
    print(f"[patch-nginx] No nginx config found for {DOMAIN} — skipping")
    raise SystemExit(0)

changed_any = False
for path in files:
    text = path.read_text(encoding="utf-8")
    original = text

    if "client_max_body_size" in text:
        text = re.sub(r"client_max_body_size\s+[^;]+;", BODY_LIMIT, text)
    else:
        text = re.sub(
            rf"(server_name[^;\n]*{re.escape(DOMAIN)}[^;\n]*;)",
            rf"\1\n    {BODY_LIMIT}",
            text,
        )

    def patch_api_block(match: re.Match[str]) -> str:
        block = match.group(0)
        if "proxy_set_header X-Forwarded-Proto $scheme;" not in block:
            return block
        for directive in TIMEOUT_DIRECTIVES:
            key = directive.split()[0]
            if key not in block:
                block = block.replace(
                    "proxy_set_header X-Forwarded-Proto $scheme;",
                    "proxy_set_header X-Forwarded-Proto $scheme;\n        " + directive,
                )
        return block

    text = re.sub(
        r"location ~ \^/\(api\|docs\|redoc\|openapi\.json\)\(/\|\$\) \{.*?\n    \}",
        patch_api_block,
        text,
        flags=re.DOTALL,
    )

    if text != original:
        path.write_text(text, encoding="utf-8")
        changed_any = True
        print(f"[patch-nginx] Updated {path}")

if changed_any:
    print("[patch-nginx] Upload limits set to 200M with 300s API timeouts")
else:
    print("[patch-nginx] Upload limits already configured")
PY
