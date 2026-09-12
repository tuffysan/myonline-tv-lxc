#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${MYONLINE_REPO:-tuffysan/myonline-tv-lxc}"
DATA="/var/lib/myonlinetv"
REQUEST="${DATA}/update-request"
STATUS="${DATA}/update-status.json"
VERSION_FILE="${DATA}/version"
PUBLISH="/opt/myonlinetv/publish"
NEW="/opt/myonlinetv/publish.new"
ROLLBACK="/opt/myonlinetv/publish.rollback"
TMP="$(mktemp -d /tmp/myonlinetv-ui-update.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$DATA" "$DATA/backups"

json_escape() {
  python3 - "$1" <<'PY'
import json,sys
print(json.dumps(sys.argv[1]))
PY
}

write_status() {
  local state="$1" target="${2:-}" message="${3:-}" current="${4:-}"
  local now
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  cat >"${STATUS}.tmp" <<EOF
{"state":$(json_escape "$state"),"currentVersion":$(json_escape "$current"),"targetVersion":$(json_escape "$target"),"message":$(json_escape "$message"),"updatedUtc":$(json_escape "$now")}
EOF
  mv "${STATUS}.tmp" "$STATUS"
  chown www-data:www-data "$STATUS" || true
  chmod 600 "$STATUS" || true
}

fail() {
  local msg="$1"
  local current="${2:-$(cat "$VERSION_FILE" 2>/dev/null || echo unknown)}"
  write_status "failed" "${TARGET_VERSION:-}" "$msg" "$current"
  rm -f "$REQUEST"
  echo "ERROR: $msg" >&2
  exit 1
}

[[ -s "$REQUEST" ]] || exit 0
TAG="$(head -n1 "$REQUEST" | tr -d '\r\n[:space:]')"
[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "Invalid requested release tag: $TAG"

TARGET_VERSION="${TAG#v}"
CURRENT_VERSION="$(cat "$VERSION_FILE" 2>/dev/null | tr -d '[:space:]')"
CURRENT_VERSION="${CURRENT_VERSION:-0.0.0}"

# Never permit UI-triggered downgrade.
if [[ "$(printf '%s\n%s\n' "$CURRENT_VERSION" "$TARGET_VERSION" | sort -V | tail -1)" != "$TARGET_VERSION" ]] || [[ "$CURRENT_VERSION" == "$TARGET_VERSION" ]]; then
  rm -f "$REQUEST"
  write_status "idle" "$TARGET_VERSION" "Already current or requested version is not newer." "$CURRENT_VERSION"
  exit 0
fi

write_status "downloading" "$TARGET_VERSION" "Downloading and verifying GitHub release..." "$CURRENT_VERSION"

ASSET="myonline-tv-web-v${TARGET_VERSION}-linux-x64.tar.gz"
BASE="https://github.com/${REPO}/releases/download/${TAG}"

curl -fL --retry 4 --retry-all-errors --connect-timeout 15 "${BASE}/${ASSET}" -o "$TMP/$ASSET" \
  || fail "Could not download release artifact." "$CURRENT_VERSION"
curl -fL --retry 4 --retry-all-errors --connect-timeout 15 "${BASE}/SHA256SUMS-RELEASE.txt" -o "$TMP/SHA256SUMS-RELEASE.txt" \
  || fail "Could not download release checksums." "$CURRENT_VERSION"
curl -fL --retry 4 --retry-all-errors --connect-timeout 15 "${BASE}/release.json" -o "$TMP/release.json" \
  || fail "Could not download release metadata." "$CURRENT_VERSION"

# Refuse UI installation unless the release explicitly opts in to this updater protocol.
python3 - "$TMP/release.json" "$TARGET_VERSION" <<'PY' || exit_code=$?
import json,sys
p=sys.argv[1]; expected=sys.argv[2]
d=json.load(open(p,encoding="utf-8"))
if str(d.get("version","")) != expected:
    print("release.json version mismatch", file=sys.stderr); sys.exit(2)
if d.get("uiSelfUpdateCompatible") is not True:
    print("release is not marked uiSelfUpdateCompatible", file=sys.stderr); sys.exit(3)
if int(d.get("uiUpdaterProtocolVersion",0)) != 1:
    print("unsupported UI updater protocol", file=sys.stderr); sys.exit(4)
PY
if [[ "${exit_code:-0}" != "0" ]]; then
  fail "This release requires the Proxmox/terminal updater and cannot be safely installed from the UI." "$CURRENT_VERSION"
fi

EXPECTED="$(awk -v n="$ASSET" '$2=="*"n || $2==n {print $1; exit}' "$TMP/SHA256SUMS-RELEASE.txt")"
[[ "$EXPECTED" =~ ^[0-9A-Fa-f]{64}$ ]] || fail "Release checksum entry is missing." "$CURRENT_VERSION"
ACTUAL="$(sha256sum "$TMP/$ASSET" | awk '{print $1}')"
[[ "${ACTUAL,,}" == "${EXPECTED,,}" ]] || fail "Release artifact checksum verification failed." "$CURRENT_VERSION"

gzip -t "$TMP/$ASSET" || fail "Release artifact gzip verification failed." "$CURRENT_VERSION"

# Reject dangerous archive paths before extracting as root.
if tar -tzf "$TMP/$ASSET" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  fail "Release artifact contains an unsafe path." "$CURRENT_VERSION"
fi

rm -rf "$NEW"
mkdir -p "$NEW"
tar -xzf "$TMP/$ASSET" -C "$NEW"
for required in MyOnlineTV.Web.dll MyOnlineTV.Web.runtimeconfig.json wwwroot/index.html wwwroot/app.js; do
  [[ -s "$NEW/$required" ]] || fail "Release artifact is missing $required." "$CURRENT_VERSION"
done

write_status "installing" "$TARGET_VERSION" "Creating backup and activating the new version..." "$CURRENT_VERSION"

# Give the HTTP response that queued this update time to reach the browser.
sleep 2

systemctl stop myonlinetv || true

STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP="${DATA}/backups/ui-pre-update-${CURRENT_VERSION}-to-${TARGET_VERSION}-${STAMP}.tar.gz"

# The app is stopped so SQLite/WAL and JSON files are consistent in the backup.
tar --exclude='./backups' --exclude='./downloads' --exclude='./update-request' --exclude='./update-status.json' \
  -czf "$BACKUP" -C "$DATA" . || {
    systemctl start myonlinetv || true
    fail "Could not create the pre-update data backup." "$CURRENT_VERSION"
  }
chown www-data:www-data "$BACKUP" || true
chmod 600 "$BACKUP" || true

rm -rf "$ROLLBACK"
if [[ -d "$PUBLISH" ]]; then cp -a "$PUBLISH" "$ROLLBACK"; fi

rm -rf /opt/myonlinetv/publish.old
[[ ! -d "$PUBLISH" ]] || mv "$PUBLISH" /opt/myonlinetv/publish.old
mv "$NEW" "$PUBLISH"
printf '%s\n' "$TARGET_VERSION" >"$VERSION_FILE"
cp "$TMP/release.json" "$DATA/release.json"

chown -R www-data:www-data "$PUBLISH" "$DATA"
chmod 700 "$DATA"
systemctl start myonlinetv

OK=0
for i in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:5080/health >/dev/null 2>&1 &&
     curl -fsS --max-time 3 http://127.0.0.1:5080/ready >/dev/null 2>&1; then
    OK=1
    break
  fi
  sleep 1
done

if [[ "$OK" != "1" ]]; then
  systemctl stop myonlinetv || true
  rm -rf "$PUBLISH"
  if [[ -d "$ROLLBACK" ]]; then cp -a "$ROLLBACK" "$PUBLISH"; fi
  printf '%s\n' "$CURRENT_VERSION" >"$VERSION_FILE"
  chown -R www-data:www-data "$PUBLISH" "$DATA"
  systemctl start myonlinetv || true
  rm -f "$REQUEST"
  write_status "failed" "$TARGET_VERSION" "The new version failed health checks and was rolled back to v${CURRENT_VERSION}." "$CURRENT_VERSION"
  exit 1
fi

rm -f "$REQUEST"
write_status "completed" "$TARGET_VERSION" "Update completed successfully. Backup: ${BACKUP}" "$TARGET_VERSION"
echo "MyOnline TV UI update complete: v${CURRENT_VERSION} -> v${TARGET_VERSION}"
