#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_STEP="startup"
on_update_error() {
  local rc=$?
  local line="${BASH_LINENO[0]:-${LINENO}}"
  echo >&2
  echo "============================================================" >&2
  echo " MyOnline TV update FAILED" >&2
  echo " Step    : ${CURRENT_STEP}" >&2
  echo " Line    : ${line}" >&2
  echo " Command : ${BASH_COMMAND}" >&2
  echo " Exit    : ${rc}" >&2
  echo "============================================================" >&2
  if [[ "${CURRENT_STEP}" == 3/8* ]]; then
    echo " Staging diagnostics:" >&2
    pct exec "$CTID" -- bash -lc '
      echo "--- /tmp release artifact ---"
      ls -lh /tmp/myonline-tv-release.tar.gz 2>&1 || true
      echo "--- publish.new ---"
      ls -lah /opt/myonlinetv/publish.new 2>&1 | head -40 || true
      echo "--- disk ---"
      df -h /opt/myonlinetv /tmp 2>&1 || true
    ' >&2 2>&1 || true
    echo "============================================================" >&2
  fi
  exit "$rc"
}
trap on_update_error ERR

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

CURRENT_STEP="1/8 Creating persistent-data backup"
echo "[1/8] Creating persistent-data backup..."
pct exec "$CTID" -- bash -lc "
set -e
mkdir -p /var/lib/myonlinetv/backups
tar --exclude='./backups' --exclude='./downloads' -czf '${BACKUP}' -C /var/lib/myonlinetv .
printf '%s\n' '${BACKUP}' >/var/lib/myonlinetv/last-pre-update-backup
chown www-data:www-data '${BACKUP}' /var/lib/myonlinetv/last-pre-update-backup
"

CURRENT_STEP="2/8 Preparing runtime"
echo "[2/8] Preparing runtime..."
pct exec "$CTID" -- bash -lc 'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates ffmpeg tar rclone'
if [[ -n "$ARTIFACT" ]]; then
  pct exec "$CTID" -- bash -lc 'DEBIAN_FRONTEND=noninteractive apt-get install -y aspnetcore-runtime-10.0'
else
  pct exec "$CTID" -- bash -lc 'DEBIAN_FRONTEND=noninteractive apt-get install -y dotnet-sdk-10.0'
fi

CURRENT_STEP="3/8 Preparing new application"
echo "[3/8] Preparing new application..."
echo "  - Cleaning staging directory..."
pct exec "$CTID" -- rm -rf /opt/myonlinetv/publish.new
echo "  - Creating staging directory..."
pct exec "$CTID" -- mkdir -p /opt/myonlinetv/publish.new
if [[ -n "$ARTIFACT" ]]; then
  [[ -f "$ARTIFACT" ]] || { echo "Release artifact not found: $ARTIFACT" >&2; exit 1; }
  echo "  - Uploading release artifact to CT ${CTID}..."
  pct push "$CTID" "$ARTIFACT" /tmp/myonline-tv-release.tar.gz

  echo "  - Verifying uploaded artifact exists and is non-empty..."
  CURRENT_STEP="3/8 Verify uploaded release artifact"
  pct exec "$CTID" -- test -s /tmp/myonline-tv-release.tar.gz

  echo "  - Verifying gzip integrity..."
  CURRENT_STEP="3/8 Verify gzip integrity"
  pct exec "$CTID" -- gzip -t /tmp/myonline-tv-release.tar.gz

  echo "  - Extracting release artifact..."
  CURRENT_STEP="3/8 Extract release artifact"
  pct exec "$CTID" -- tar -xzf /tmp/myonline-tv-release.tar.gz -C /opt/myonlinetv/publish.new

  echo "  - Verifying extracted application..."
  CURRENT_STEP="3/8 Verify extracted application"
  pct exec "$CTID" -- test -s /opt/myonlinetv/publish.new/MyOnlineTV.Web.dll
  pct exec "$CTID" -- test -s /opt/myonlinetv/publish.new/MyOnlineTV.Web.runtimeconfig.json
  pct exec "$CTID" -- test -s /opt/myonlinetv/publish.new/wwwroot/index.html
  pct exec "$CTID" -- test -s /opt/myonlinetv/publish.new/wwwroot/app.js

  echo "  - Cleaning uploaded release artifact..."
  CURRENT_STEP="3/8 Cleanup uploaded release artifact"
  # Cleanup is best-effort. A successfully extracted and verified release must
  # never be rejected only because Proxmox `pct exec` returns a transient
  # non-zero status while deleting an already-consumed /tmp artifact.
  if ! pct exec "$CTID" -- bash -lc 'rm -f /tmp/myonline-tv-release.tar.gz'; then
    echo "  - Warning: could not clean /tmp/myonline-tv-release.tar.gz; continuing because staging is already verified." >&2
  fi

  CURRENT_STEP="3/8 Preparing new application"
else
  pct exec "$CTID" -- mkdir -p /opt/myonlinetv/src/wwwroot
  pct push "$CTID" "${REPO_DIR}/app/MyOnlineTV.Web.csproj" /opt/myonlinetv/src/MyOnlineTV.Web.csproj
  pct push "$CTID" "${REPO_DIR}/app/Program.cs" /opt/myonlinetv/src/Program.cs
  for f in "${REPO_DIR}"/app/wwwroot/*; do pct push "$CTID" "$f" "/opt/myonlinetv/src/wwwroot/$(basename "$f")"; done
  pct exec "$CTID" -- bash -lc 'dotnet publish /opt/myonlinetv/src/MyOnlineTV.Web.csproj -c Release -o /opt/myonlinetv/publish.new'
fi

CURRENT_STEP="4/8 Creating binary rollback snapshot"
echo "[4/8] Creating binary rollback snapshot..."
pct exec "$CTID" -- bash -lc "
set -e
systemctl stop myonlinetv || true
rm -rf /opt/myonlinetv/publish.rollback
if [[ -d /opt/myonlinetv/publish ]]; then cp -a /opt/myonlinetv/publish /opt/myonlinetv/publish.rollback; fi
printf '%s\n' '${CURRENT_VERSION}' >/var/lib/myonlinetv/rollback-version
"

CURRENT_STEP="5/8 Activating v${TARGET_VERSION}"
echo "[5/8] Activating v${TARGET_VERSION}..."
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

CURRENT_STEP="6/8 Health check"
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


CURRENT_STEP="7/8 Applying system configuration migrations"
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


echo "Installing/updating secure UI update worker..."
pct push "$CTID" "${REPO_DIR}/scripts/myonlinetv-self-update.sh" /usr/local/sbin/myonlinetv-self-update
pct push "$CTID" "${REPO_DIR}/scripts/myonlinetv-update.service" /etc/systemd/system/myonlinetv-update.service
pct push "$CTID" "${REPO_DIR}/scripts/myonlinetv-update.path" /etc/systemd/system/myonlinetv-update.path
pct exec "$CTID" -- bash -lc '
set -e
chmod 700 /usr/local/sbin/myonlinetv-self-update
chown root:root /usr/local/sbin/myonlinetv-self-update /etc/systemd/system/myonlinetv-update.service /etc/systemd/system/myonlinetv-update.path
mkdir -p /var/lib/myonlinetv
chown www-data:www-data /var/lib/myonlinetv
systemctl daemon-reload
systemctl enable --now myonlinetv-update.path
'

CURRENT_STEP="8/8 Verifying backend and reverse proxy"
echo "[8/8] Verifying backend and reverse proxy..."

FINAL_VERIFY=1
if ! pct exec "$CTID" -- bash -lc '
set -e
grep -q "X-Forwarded-Proto \$my_forwarded_proto" /etc/nginx/sites-enabled/myonlinetv
grep -q "proxy_set_header Host \$my_forwarded_host" /etc/nginx/sites-enabled/myonlinetv
grep -q "X-Forwarded-Host \$my_forwarded_host" /etc/nginx/sites-enabled/myonlinetv
systemctl is-active --quiet myonlinetv
systemctl is-active --quiet nginx

# Give the application time to settle after the migration/restart.
for i in $(seq 1 15); do
  if curl -fsS --max-time 3 http://127.0.0.1:5080/health >/dev/null 2>&1 &&
     curl -fsS --max-time 3 http://127.0.0.1:5080/ready  >/dev/null 2>&1 &&
     curl -fsS --max-time 3 http://127.0.0.1/health      >/dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done
exit 1
'; then
  FINAL_VERIFY=0
fi

if [[ "$FINAL_VERIFY" != "1" ]]; then
  echo "Final backend/reverse-proxy verification failed." >&2
  echo "Rolling back to v${CURRENT_VERSION}..." >&2

  # Do not let the ERR trap interrupt the rollback sequence.
  trap - ERR
  pct exec "$CTID" -- bash -lc "
set -e
systemctl stop myonlinetv || true
if [[ -d /opt/myonlinetv/publish.rollback ]]; then
  rm -rf /opt/myonlinetv/publish
  cp -a /opt/myonlinetv/publish.rollback /opt/myonlinetv/publish
  printf '%s\\n' '${CURRENT_VERSION}' >/var/lib/myonlinetv/version
else
  echo 'Rollback snapshot is missing.' >&2
  exit 2
fi
systemctl start myonlinetv
"

  # Restore nginx/system configuration from the previous release source when
  # possible by re-running the current installed service against the existing
  # configuration. At minimum verify the restored backend is healthy.
  ROLLBACK_OK=0
  for i in $(seq 1 15); do
    if pct exec "$CTID" -- curl -fsS --max-time 3 http://127.0.0.1:5080/health >/dev/null 2>&1; then
      ROLLBACK_OK=1
      break
    fi
    sleep 1
  done

  if [[ "$ROLLBACK_OK" == "1" ]]; then
    echo "Rollback verified: v${CURRENT_VERSION} backend is healthy." >&2
  else
    echo "CRITICAL: rollback was activated but its backend health check failed." >&2
    echo "Inspect: pct exec ${CTID} -- journalctl -u myonlinetv -n 200 --no-pager" >&2
  fi
  echo "Persistent-data backup retained at ${BACKUP}." >&2
  exit 1
fi

echo "Update verified."
echo "Updated v${CURRENT_VERSION} -> v${TARGET_VERSION}"
echo "Pre-update data backup: ${BACKUP}"
