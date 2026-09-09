#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:?Usage: update-local.sh <repo-dir>}"
TARGET_VERSION="$(tr -d '[:space:]' < "${REPO_DIR}/VERSION")"
CTID="${CTID:-145}"
FORCE="${FORCE:-0}"

[[ $EUID -eq 0 ]] || { echo "Run as root on Proxmox."; exit 1; }
pct status "$CTID" >/dev/null || { echo "CT ${CTID} was not found."; exit 1; }

CURRENT_VERSION="$(pct exec "$CTID" -- bash -lc 'cat /var/lib/myonlinetv/version 2>/dev/null || echo 0.0.0' | tr -d '[:space:]')"

echo "============================================================"
echo " MyOnline TV Web - GitHub Update"
echo "============================================================"
echo " Installed : v${CURRENT_VERSION}"
echo " Available : v${TARGET_VERSION}"
echo " CTID      : ${CTID}"
echo "============================================================"

if [[ "$CURRENT_VERSION" == "$TARGET_VERSION" && "$FORCE" != "1" ]]; then
  echo "Already up to date."
  echo "Use FORCE=1 to reinstall the same version."
  exit 0
fi

echo "[1/6] Installing/updating dependencies..."
pct exec "$CTID" -- bash -lc \
  'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates ffmpeg rsync'

echo "[2/6] Uploading source..."
pct exec "$CTID" -- mkdir -p /opt/myonlinetv/src/wwwroot /opt/myonlinetv/publish.new /var/lib/myonlinetv/downloads
pct push "$CTID" "${REPO_DIR}/app/MyOnlineTV.Web.csproj" /opt/myonlinetv/src/MyOnlineTV.Web.csproj
pct push "$CTID" "${REPO_DIR}/app/Program.cs" /opt/myonlinetv/src/Program.cs
for f in "${REPO_DIR}"/app/wwwroot/*; do
  pct push "$CTID" "$f" "/opt/myonlinetv/src/wwwroot/$(basename "$f")"
done

echo "[3/6] Building v${TARGET_VERSION}..."
pct exec "$CTID" -- bash -lc '
set -e
rm -rf /opt/myonlinetv/publish.new
dotnet publish /opt/myonlinetv/src/MyOnlineTV.Web.csproj -c Release -o /opt/myonlinetv/publish.new
'

echo "[4/6] Creating rollback snapshot..."
pct exec "$CTID" -- bash -lc "
set -e
systemctl stop myonlinetv || true
rm -rf /opt/myonlinetv/publish.rollback
if [[ -d /opt/myonlinetv/publish ]]; then
  cp -a /opt/myonlinetv/publish /opt/myonlinetv/publish.rollback
fi
printf '%s\n' '${CURRENT_VERSION}' >/var/lib/myonlinetv/rollback-version
"

echo "[5/6] Activating v${TARGET_VERSION}..."
pct exec "$CTID" -- bash -lc "
set -e
rm -rf /opt/myonlinetv/publish.old
if [[ -d /opt/myonlinetv/publish ]]; then mv /opt/myonlinetv/publish /opt/myonlinetv/publish.old; fi
mv /opt/myonlinetv/publish.new /opt/myonlinetv/publish
printf '%s\n' '${TARGET_VERSION}' >/var/lib/myonlinetv/version
chown -R www-data:www-data /opt/myonlinetv /var/lib/myonlinetv
chmod 700 /var/lib/myonlinetv
systemctl daemon-reload
systemctl start myonlinetv
"

echo "[6/6] Health check..."
sleep 2
if ! pct exec "$CTID" -- curl -fsS http://127.0.0.1:5080/api/status; then
  echo
  echo "Health check failed. Rolling back automatically..."
  pct exec "$CTID" -- bash -lc '
set -e
systemctl stop myonlinetv || true
if [[ -d /opt/myonlinetv/publish.rollback ]]; then
  rm -rf /opt/myonlinetv/publish
  cp -a /opt/myonlinetv/publish.rollback /opt/myonlinetv/publish
  if [[ -f /var/lib/myonlinetv/rollback-version ]]; then
    cp /var/lib/myonlinetv/rollback-version /var/lib/myonlinetv/version
  fi
  systemctl start myonlinetv
fi
'
  exit 1
fi

echo
echo "Update completed successfully: v${CURRENT_VERSION} -> v${TARGET_VERSION}"
