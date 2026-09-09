#!/usr/bin/env bash
set -euo pipefail
CTID="${CTID:-145}"
RESTORE_DATA="${RESTORE_DATA:-0}"

[[ $EUID -eq 0 ]] || { echo "Run as root on Proxmox."; exit 1; }
pct status "$CTID" >/dev/null || { echo "CT ${CTID} not found."; exit 1; }

pct exec "$CTID" -- bash -lc "
set -e
[[ -d /opt/myonlinetv/publish.rollback ]] || { echo 'No application rollback snapshot available.'; exit 1; }
CURRENT=\$(cat /var/lib/myonlinetv/version 2>/dev/null || echo unknown)
ROLLBACK=\$(cat /var/lib/myonlinetv/rollback-version 2>/dev/null || echo previous)
echo \"Application rollback: \${CURRENT} -> \${ROLLBACK}\"
systemctl stop myonlinetv || true
rm -rf /opt/myonlinetv/publish
cp -a /opt/myonlinetv/publish.rollback /opt/myonlinetv/publish
[[ ! -f /var/lib/myonlinetv/rollback-version ]] || cp /var/lib/myonlinetv/rollback-version /var/lib/myonlinetv/version

if [[ '${RESTORE_DATA}' == '1' ]]; then
  BACKUP=\$(cat /var/lib/myonlinetv/last-pre-update-backup 2>/dev/null || true)
  [[ -n \"\$BACKUP\" && -f \"\$BACKUP\" ]] || { echo 'No pre-update data backup found.'; exit 1; }
  echo \"Restoring data from \$BACKUP\"
  TMP=\$(mktemp -d)
  tar -xzf \"\$BACKUP\" -C \"\$TMP\"
  for f in admin.json secrets.key providers.json favourites.json continue-watching.json version release.json; do
    [[ ! -f \"\$TMP/\$f\" ]] || cp -a \"\$TMP/\$f\" \"/var/lib/myonlinetv/\$f\"
  done
  rm -rf \"\$TMP\"
fi

chown -R www-data:www-data /opt/myonlinetv /var/lib/myonlinetv
systemctl start myonlinetv
sleep 2
curl -fsS http://127.0.0.1:5080/health
echo
curl -fsS http://127.0.0.1:5080/ready
echo
echo 'Rollback completed.'
"
