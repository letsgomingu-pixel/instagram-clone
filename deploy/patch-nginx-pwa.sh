#!/usr/bin/env bash
# Insert PWA/SEO static locations into the live nginx site config without
# overwriting certbot SSL server blocks. Safe to re-run on every redeploy.

set -euo pipefail

echo "[patch-nginx-pwa] Ensuring robots/sitemap/sw/manifest locations..."

python3 << 'PY'
from pathlib import Path

DOMAIN = "iamnotafishmonger.com"
MARK = "location = /sw.js"

BLOCK = """
    location = /robots.txt {
        add_header Content-Type "text/plain; charset=utf-8";
        add_header Cache-Control "public, max-age=3600";
        try_files $uri =404;
    }

    location = /sitemap.xml {
        add_header Content-Type "application/xml; charset=utf-8";
        add_header Cache-Control "public, max-age=300";
        try_files $uri =404;
    }

    location = /sitemap-static.xml {
        add_header Content-Type "application/xml; charset=utf-8";
        add_header Cache-Control "public, max-age=3600";
        try_files $uri =404;
    }

    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Service-Worker-Allowed "/";
        try_files $uri =404;
    }

    location = /site.webmanifest {
        default_type application/manifest+json;
        add_header Cache-Control "public, max-age=300";
        try_files $uri =404;
    }

    location = /offline.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files $uri =404;
    }

"""

ANCHOR = "    location / {"

search_roots = [
    Path("/etc/nginx/sites-enabled"),
    Path("/etc/nginx/sites-available"),
    Path("/etc/nginx/conf.d"),
]
seen: set[Path] = set()
changed = False

for root in search_roots:
    if not root.is_dir():
        continue
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path in seen:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if DOMAIN not in text:
            continue
        seen.add(path)
        if MARK in text:
            continue
        if ANCHOR not in text:
            print(f"[patch-nginx-pwa] skip {path}: no SPA location / block")
            continue
        path.write_text(text.replace(ANCHOR, BLOCK + ANCHOR, 1), encoding="utf-8")
        print(f"[patch-nginx-pwa] Updated {path}")
        changed = True

if not changed:
    print("[patch-nginx-pwa] locations already present or no site config found")
PY

nginx -t
echo "[patch-nginx-pwa] nginx config ok"
