#!/usr/bin/env bash
set -euo pipefail

MYONLINE_REPO="${MYONLINE_REPO:-tuffysan/myonline-tv-lxc}"
MYONLINE_CHANNEL="${MYONLINE_CHANNEL:-stable}"
MYONLINE_REF="${MYONLINE_REF:-}"

TMP_ROOT="$(mktemp -d /tmp/myonline-tv-install.XXXXXX)"
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
  echo "No stable release selected; using source-build mode from main."
  unset MYONLINE_ARTIFACT || true
fi

exec bash "$REPO_DIR/scripts/install-local.sh" "$REPO_DIR"
