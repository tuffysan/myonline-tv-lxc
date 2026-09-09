#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:?Usage: update-local.sh <repo-dir>}"
source "${REPO_DIR}/scripts/github-common.sh"
TARGET_VERSION="$(tr -d '[:space:]' < "${REPO_DIR}/VERSION")"
ARTIFACT="${MYONLINE_ARTIFACT:-}"
CTID="${CTID:-145}"
FORCE="${FORCE:-0}"

[[ $EUID -eq 0 ]] || { echo "Run as root on Proxmox."; exit 1; }
pct status "$CTID" >/dev/null || { echo "CT ${CTID} not found."; exit 1; }

CURRENT_VERSION="$(pct exec "$CTID" -- bash -lc 'cat /var/lib/myonlinetv/version 2>/dev/null || echo 0.0.0' | tr -d '[:space:]')"
echo "Installed: v${CURRENT_VERSION}"
echo "Target   : v${TARGET_VERSION}"
echo "Mode     : $([[ -n "$ARTIFACT" ]] && echo 'prebuilt release' || echo 'source build')"

if [[ "$CURRENT_VERSION" == "$TARGET_VERSION" && "$FORCE" != "1" ]]; then
  echo "Already up to date."
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/var/lib/myonlinetv/backups/pre-update-${CURRENT_VERSION}-to-${TARGET_VERSION}-${STAMP}.tar.gz"

echo "[1/7] Creating persistent-data backup..."
pct exec "$CTID" -- bash -lc "
set -e
mkdir -p /var/lib/myonlinetv/backups
tar --exclude='./backups' --exclude='./downloads' -czf '${BACKUP}' -C /var/lib/myonlinetv .
printf '%s\n' '${BACKUP}' >/var/lib/myonlinetv/last-pre-update-backup
chown www-data:www-data '${BACKUP}' /var/lib/myonlinetv/last-pre-update-backup
"

echo "[2/7] Preparing runtime..."
pct exec "$CTID" -- bash -lc 'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates ffmpeg tar'
if [[ -n "$ARTIFACT" ]]; then
  pct exec "$CTID" -- bash -lc 'DEBIAN_FRONTEND=noninteractive apt-get install -y aspnetcore-runtime-10.0'
else
  pct exec "$CTID" -- bash -lc 'DEBIAN_FRONTEND=noninteractive apt-get install -y dotnet-sdk-10.0'
fi

echo "[3/7] Preparing new application..."
pct exec "$CTID" -- rm -rf /opt/myonlinetv/publish.new
pct exec "$CTID" -- mkdir -p /opt/myonlinetv/publish.new
if [[ -n "$ARTIFACT" ]]; then
  pct push "$CTID" "$ARTIFACT" /tmp/myonline-tv-release.tar.gz
  pct exec "$CTID" -- bash -lc 'tar -xzf /tmp/myonline-tv-release.tar.gz -C /opt/myonlinetv/publish.new && rm -f /tmp/myonline-tv-release.tar.gz'
else
  pct exec "$CTID" -- mkdir -p /opt/myonlinetv/src/wwwroot
  pct push "$CTID" "${REPO_DIR}/app/MyOnlineTV.Web.csproj" /opt/myonlinetv/src/MyOnlineTV.Web.csproj
  pct push "$CTID" "${REPO_DIR}/app/Program.cs" /opt/myonlinetv/src/Program.cs
  for f in "${REPO_DIR}"/app/wwwroot/*; do pct push "$CTID" "$f" "/opt/myonlinetv/src/wwwroot/$(basename "$f")"; done
  pct exec "$CTID" -- bash -lc 'dotnet publish /opt/myonlinetv/src/MyOnlineTV.Web.csproj -c Release -o /opt/myonlinetv/publish.new'
fi

echo "[4/7] Creating binary rollback snapshot..."
pct exec "$CTID" -- bash -lc "
set -e
systemctl stop myonlinetv || true
rm -rf /opt/myonlinetv/publish.rollback
if [[ -d /opt/myonlinetv/publish ]]; then cp -a /opt/myonlinetv/publish /opt/myonlinetv/publish.rollback; fi
printf '%s\n' '${CURRENT_VERSION}' >/var/lib/myonlinetv/rollback-version
"

echo "[5/7] Activating v${TARGET_VERSION}..."
pct exec "$CTID" -- bash -lc "
set -e
rm -rf /opt/myonlinetv/publish.old
[[ ! -d /opt/myonlinetv/publish ]] || mv /opt/myonlinetv/publish /opt/myonlinetv/publish.old
mv /opt/myonlinetv/publish.new /opt/myonlinetv/publish
printf '%s\n' '${TARGET_VERSION}' >/var/lib/myonlinetv/version
cat >/var/lib/myonlinetv/release.json <<'META'
$(cat "${REPO_DIR}/release.json")
META
chown -R www-data:www-data /opt/myonlinetv /var/lib/myonlinetv
chmod 700 /var/lib/myonlinetv
systemctl daemon-reload
systemctl start myonlinetv
"

echo "[6/8] Health check..."
sleep 2
HEALTH=1
pct exec "$CTID" -- curl -fsS http://127.0.0.1:5080/health >/dev/null || HEALTH=0
pct exec "$CTID" -- curl -fsS http://127.0.0.1:5080/ready >/dev/null || HEALTH=0

if [[ "$HEALTH" != "1" ]]; then
  echo "New version failed health/readiness checks. Rolling back application..."
  pct exec "$CTID" -- bash -lc '
set -e
systemctl stop myonlinetv || true
if [[ -d /opt/myonlinetv/publish.rollback ]]; then
  rm -rf /opt/myonlinetv/publish
  cp -a /opt/myonlinetv/publish.rollback /opt/myonlinetv/publish
  [[ ! -f /var/lib/myonlinetv/rollback-version ]] || cp /var/lib/myonlinetv/rollback-version /var/lib/myonlinetv/version
fi
systemctl start myonlinetv
'
  echo "Binary rollback completed. Data backup retained at ${BACKUP}."
  exit 1
fi


echo "[7/8] Applying system configuration migrations..."
set_container_hostname "$CTID" "MyOnlineTV"
write_nginx_config "$CTID"

pct exec "$CTID" -- bash -lc '
set -e
systemctl daemon-reload
systemctl restart myonlinetv
systemctl is-active --quiet myonlinetv
systemctl is-active --quiet nginx
'

echo "[8/8] Verifying backend and reverse proxy..."
pct exec "$CTID" -- bash -lc '
set -e
grep -q "X-Forwarded-Proto \$my_forwarded_proto" /etc/nginx/sites-enabled/myonlinetv
grep -q "X-Forwarded-Host \$host" /etc/nginx/sites-enabled/myonlinetv
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1:5080/health >/dev/null
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1/health >/dev/null
'

echo "Update verified."
echo "Updated v${CURRENT_VERSION} -> v${TARGET_VERSION}"
echo "Pre-update data backup: ${BACKUP}"
