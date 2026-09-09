#!/usr/bin/env bash
set -euo pipefail

MYONLINE_REPO="${MYONLINE_REPO:-tuffysan/myonline-tv-lxc}"
MYONLINE_CHANNEL="${MYONLINE_CHANNEL:-stable}"
MYONLINE_REF="${MYONLINE_REF:-}"

TMP_ROOT="$(mktemp -d /tmp/myonline-tv-update.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

curl -fsSL --retry 3 \
  "https://raw.githubusercontent.com/${MYONLINE_REPO}/main/scripts/github-common.sh" \
  -o "$TMP_ROOT/github-common.sh"
source "$TMP_ROOT/github-common.sh"

REF="$(resolve_ref)"
REPO_DIR="$(download_repo "$MYONLINE_REPO" "$REF" "$TMP_ROOT/source")"

if [[ "$REF" == v* ]]; then
  ARTIFACT="$(download_release_artifact "$MYONLINE_REPO" "$REF" "$TMP_ROOT/release")"
  export MYONLINE_ARTIFACT="$ARTIFACT"
else
  unset MYONLINE_ARTIFACT || true
fi

exec bash "$REPO_DIR/scripts/update-local.sh" "$REPO_DIR"


echo "Applying v0.3.8 system configuration migrations..."
set_container_hostname "$CTID" "MyOnlineTV"
write_nginx_config "$CTID"

# Ensure Kestrel/service configuration is reloaded after binary/config updates.
pct exec "$CTID" -- bash -lc '
set -e
systemctl daemon-reload
systemctl restart myonlinetv
systemctl is-active --quiet myonlinetv
'

echo "Verifying reverse-proxy configuration..."
pct exec "$CTID" -- bash -lc '
set -e
grep -q "X-Forwarded-Proto \$my_forwarded_proto" /etc/nginx/sites-enabled/myonlinetv
grep -q "X-Forwarded-Host \$host" /etc/nginx/sites-enabled/myonlinetv
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1:5080/health >/dev/null
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1/health >/dev/null
'

