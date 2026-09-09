#!/usr/bin/env bash
set -euo pipefail

MYONLINE_REPO="${MYONLINE_REPO:-tuffysan/myonline-tv-lxc}"
MYONLINE_CHANNEL="${MYONLINE_CHANNEL:-stable}"
MYONLINE_REF="${MYONLINE_REF:-}"

TMP_ROOT="$(mktemp -d /tmp/myonline-tv-update.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

common_url="https://raw.githubusercontent.com/${MYONLINE_REPO}/main/scripts/github-common.sh"
echo "Loading updater helper from ${MYONLINE_REPO}..."
curl -fsSL --retry 3 "$common_url" -o "$TMP_ROOT/github-common.sh"
# shellcheck source=/dev/null
source "$TMP_ROOT/github-common.sh"

REF="$(resolve_ref)"
REPO_DIR="$(download_repo "$MYONLINE_REPO" "$REF" "$TMP_ROOT/source")"

exec bash "$REPO_DIR/scripts/update-local.sh" "$REPO_DIR"
