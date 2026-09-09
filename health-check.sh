#!/usr/bin/env bash
set -euo pipefail
CTID="${CTID:-145}"
[[ $EUID -eq 0 ]] || { echo "Run as root on Proxmox."; exit 1; }

pct exec "$CTID" -- bash -lc '
echo "=== VERSION ==="
cat /var/lib/myonlinetv/version 2>/dev/null || echo unknown
echo
echo "=== HEALTH ==="
curl -fsS http://127.0.0.1:5080/health
echo
echo
echo "=== READINESS ==="
curl -fsS http://127.0.0.1:5080/ready
echo
echo
echo "=== SERVICE ==="
systemctl --no-pager --full status myonlinetv | head -35
echo
echo "=== NGINX ==="
systemctl is-active nginx
nginx -t
echo
echo "=== FFMPEG ==="
ffmpeg -version | head -1
echo
echo "=== DATA/BACKUPS ==="
du -sh /var/lib/myonlinetv
find /var/lib/myonlinetv/backups -maxdepth 1 -type f 2>/dev/null | tail -10
echo
echo "=== DISK ==="
df -h /var/lib/myonlinetv
'
