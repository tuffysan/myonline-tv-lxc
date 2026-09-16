#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${MYONLINE_REPO:-tuffysan/myonline-tv-lxc}"
REQUESTED_VERSION="${VERSION:-}"
TMP_ROOT="$(mktemp -d /tmp/myonline-tv-install.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

latest_tag() {
  curl -fsSL --retry 3 --connect-timeout 15 -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/${REPO}/releases/latest" \
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
echo " MyOnline TV - Proxmox installer"
echo " Latest release: ${TAG}"
echo " CTID: ${CTID:-automatic}"
echo "============================================================"
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
[[ -x "$TMP_ROOT/source/scripts/install-local.sh" || -s "$TMP_ROOT/source/scripts/install-local.sh" ]] || { echo "ERROR: install-local.sh missing." >&2; exit 1; }
ACTUAL="$(tr -d '[:space:]' < "$TMP_ROOT/source/VERSION")"
[[ "$ACTUAL" == "$VER" ]] || { echo "ERROR: Release source VERSION=${ACTUAL}, expected ${VER}." >&2; exit 1; }
export MYONLINE_ARTIFACT="$TMP_ROOT/release/$APP"
exec bash "$TMP_ROOT/source/scripts/install-local.sh" "$TMP_ROOT/source"
