#!/usr/bin/env bash
set -euo pipefail
CTID="${CTID:-145}"

[[ $EUID -eq 0 ]] || { echo "Run as root on Proxmox."; exit 1; }
pct status "$CTID" >/dev/null || { echo "CT ${CTID} not found."; exit 1; }

pct exec "$CTID" -- bash -lc '
echo "=== VERSION ==="
cat /var/lib/myonlinetv/version 2>/dev/null || echo unknown
echo
echo "=== SERVICE ==="
systemctl --no-pager --full status myonlinetv | head -35
echo
echo "=== API ==="
curl -fsS http://127.0.0.1:5080/api/status
echo
echo
echo "=== NGINX ==="
systemctl is-active nginx
nginx -t
echo
echo "=== FFMPEG ==="
ffmpeg -version | head -1
echo
echo "=== DATA ==="
ls -ld /var/lib/myonlinetv
du -sh /var/lib/myonlinetv
echo
echo "=== DISK ==="
df -h /var/lib/myonlinetv
'
