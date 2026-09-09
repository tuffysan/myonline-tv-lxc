#!/usr/bin/env bash
set -euo pipefail

MYONLINE_REPO="${MYONLINE_REPO:-tuffysan/myonline-tv-lxc}"
MYONLINE_CHANNEL="${MYONLINE_CHANNEL:-stable}"
MYONLINE_REF="${MYONLINE_REF:-}"

github_latest_release_tag() {
  local repo="$1"
  local effective
  effective="$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/${repo}/releases/latest" 2>/dev/null || true)"
  if [[ -n "$effective" && "$effective" == *"/tag/"* ]]; then
    basename "$effective"
  fi
}

resolve_ref() {
  if [[ -n "${MYONLINE_REF}" ]]; then
    printf '%s\n' "$MYONLINE_REF"
    return
  fi
  if [[ "${MYONLINE_CHANNEL}" == "stable" ]]; then
    local tag
    tag="$(github_latest_release_tag "$MYONLINE_REPO")"
    if [[ -n "$tag" ]]; then printf '%s\n' "$tag"; return; fi
  fi
  printf 'main\n'
}

download_repo() {
  local repo="$1" ref="$2" target="$3"
  local archive="${target}/repo.tar.gz"
  mkdir -p "$target"
  echo "Downloading source ${repo}@${ref}..." >&2
  curl -fL --retry 3 --connect-timeout 15 \
    "https://github.com/${repo}/archive/refs/heads/${ref}.tar.gz" -o "$archive" 2>/dev/null || \
  curl -fL --retry 3 --connect-timeout 15 \
    "https://github.com/${repo}/archive/refs/tags/${ref}.tar.gz" -o "$archive"
  tar -xzf "$archive" -C "$target"
  local dir
  dir="$(find "$target" -mindepth 1 -maxdepth 1 -type d | head -1)"
  [[ -n "$dir" ]] || { echo "Could not locate extracted repository."; return 1; }
  printf '%s\n' "$dir"
}

download_release_artifact() {
  local repo="$1" ref="$2" target="$3"
  local version="${ref#v}"
  local name="myonline-tv-web-v${version}-linux-x64.tar.gz"
  local sums="SHA256SUMS-RELEASE.txt"
  mkdir -p "$target"

  local base="https://github.com/${repo}/releases/download/${ref}"
  echo "Downloading prebuilt ${name}..." >&2
  curl -fL --retry 3 "${base}/${name}" -o "${target}/${name}"
  curl -fL --retry 3 "${base}/${sums}" -o "${target}/${sums}"

  (
    cd "$target"
    grep "  ${name}$" "$sums" | sha256sum -c - >&2
  )
  printf '%s\n' "${target}/${name}"
}
