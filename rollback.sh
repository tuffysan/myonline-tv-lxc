#!/usr/bin/env bash
set -euo pipefail
CTID="${CTID:-145}"

[[ $EUID -eq 0 ]] || { echo "Run as root on Proxmox."; exit 1; }
pct status "$CTID" >/dev/null || { echo "CT ${CTID} not found."; exit 1; }

pct exec "$CTID" -- bash -lc '
set -e
[[ -d /opt/myonlinetv/publish.rollback ]] || { echo "No rollback snapshot available."; exit 1; }
CURRENT="$(cat /var/lib/myonlinetv/version 2>/dev/null || echo unknown)"
ROLLBACK="$(cat /var/lib/myonlinetv/rollback-version 2>/dev/null || echo previous)"
echo "Rolling back ${CURRENT} -> ${ROLLBACK}..."
systemctl stop myonlinetv || true
rm -rf /opt/myonlinetv/publish
cp -a /opt/myonlinetv/publish.rollback /opt/myonlinetv/publish
if [[ -f /var/lib/myonlinetv/rollback-version ]]; then
  cp /var/lib/myonlinetv/rollback-version /var/lib/myonlinetv/version
fi
chown -R www-data:www-data /opt/myonlinetv/publish
systemctl start myonlinetv
sleep 2
curl -fsS http://127.0.0.1:5080/api/status
echo
echo "Rollback completed."
'
