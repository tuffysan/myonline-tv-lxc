#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${MYONLINE_REPO:-tuffysan/myonline-tv-lxc}"
REQUESTED_VERSION="${VERSION:-}"
CTID="${CTID:-145}"
TMP_ROOT="$(mktemp -d /tmp/myonline-tv-update.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

latest_tag() {
  curl -fsSL --retry 3 --connect-timeout 15 \
    -H 'Accept: application/vnd.github+json' \
    -H 'Cache-Control: no-cache' \
    -H 'Pragma: no-cache' \
    "https://api.github.com/repos/${REPO}/releases/latest?nocache=$(date +%s)" \
    | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1
}
normalize_tag() {
  local v="${1:-}"
  [[ -n "$v" ]] || return 1
  [[ "$v" == v* ]] && printf '%s\n' "$v" || printf 'v%s\n' "$v"
}

if [[ -n "$REQUESTED_VERSION" ]]; then TAG="$(normalize_tag "$REQUESTED_VERSION")"; else TAG="$(latest_tag)"; fi
[[ -n "$TAG" ]] || { echo "ERROR: Could not determine latest published GitHub Release." >&2; exit 1; }
VER="${TAG#v}"
BASE="https://github.com/${REPO}/releases/download/${TAG}"
SRC="myonline-tv-lxc-v${VER}-source.tar.gz"
APP="myonline-tv-web-v${VER}-linux-x64.tar.gz"
SUMS="SHA256SUMS-RELEASE.txt"

echo "============================================================"
echo " MyOnline TV - Proxmox updater"
echo " CTID: ${CTID}"
echo " Latest release: ${TAG}"
echo "============================================================"
command -v pct >/dev/null || { echo "ERROR: pct not found. Run this on the Proxmox host." >&2; exit 1; }
pct status "$CTID" >/dev/null 2>&1 || { echo "ERROR: CT ${CTID} does not exist." >&2; exit 1; }
mkdir -p "$TMP_ROOT/release" "$TMP_ROOT/source"
for f in "$SRC" "$APP" "$SUMS"; do
  echo "Downloading ${f}..."
  curl -fL --retry 3 --connect-timeout 15 "${BASE}/${f}" -o "$TMP_ROOT/release/$f"
done
(
  cd "$TMP_ROOT/release"
  grep -F "  ${SRC}" "$SUMS" | tail -1 | sha256sum -c -
  grep -F "  ${APP}" "$SUMS" | tail -1 | sha256sum -c -
)
tar -xzf "$TMP_ROOT/release/$SRC" -C "$TMP_ROOT/source"
[[ -s "$TMP_ROOT/source/VERSION" ]] || { echo "ERROR: Release source package is invalid (VERSION missing)." >&2; exit 1; }
[[ -s "$TMP_ROOT/source/scripts/update-local.sh" ]] || { echo "ERROR: update-local.sh missing." >&2; exit 1; }
ACTUAL="$(tr -d '[:space:]' < "$TMP_ROOT/source/VERSION")"
[[ "$ACTUAL" == "$VER" ]] || { echo "ERROR: Release source VERSION=${ACTUAL}, expected ${VER}." >&2; exit 1; }
export CTID MYONLINE_ARTIFACT="$TMP_ROOT/release/$APP"
exec bash "$TMP_ROOT/source/scripts/update-local.sh" "$TMP_ROOT/source"
