#!/usr/bin/env bash
# Runs on Proxmox host after a successful MyOnline TV install/update.
set -Eeuo pipefail
CTID="${CTID:?CTID is required}"
REPO_DIR="${1:?Source directory required}"
[[ "${MYONLINE_YOUTUBE_BRIDGE:-1}" == "1" ]] || { echo "YouTube bridge disabled"; exit 0; }
command -v pct >/dev/null
for f in server.py install.sh myonlinetv-youtube-bridge.service; do
  test -s "$REPO_DIR/scripts/youtube-bridge/$f" || { echo "YouTube bridge file missing: $f" >&2; exit 1; }
done
pct exec "$CTID" -- mkdir -p /tmp/myonlinetv-youtube-install
for f in server.py install.sh myonlinetv-youtube-bridge.service; do
  pct push "$CTID" "$REPO_DIR/scripts/youtube-bridge/$f" "/tmp/myonlinetv-youtube-install/$f"
done
pct exec "$CTID" -- bash /tmp/myonlinetv-youtube-install/install.sh
pct exec "$CTID" -- curl -fsS --max-time 5 http://127.0.0.1:5089/health
echo "YouTube bridge installed and healthy in CT $CTID"
