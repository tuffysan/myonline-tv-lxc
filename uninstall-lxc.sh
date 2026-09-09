#!/usr/bin/env bash
set -euo pipefail
CTID="${CTID:-145}"

[[ $EUID -eq 0 ]] || { echo "Run as root on Proxmox."; exit 1; }
pct status "$CTID" >/dev/null 2>&1 || { echo "CT ${CTID} not found."; exit 1; }

echo "WARNING: This permanently deletes CT ${CTID} and all MyOnline TV data."
read -r -p "Type DELETE-${CTID} to continue: " answer
[[ "$answer" == "DELETE-${CTID}" ]] || { echo "Cancelled."; exit 1; }

pct stop "$CTID" || true
pct destroy "$CTID" --purge
echo "CT ${CTID} deleted."
