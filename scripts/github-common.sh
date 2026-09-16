#!/usr/bin/env bash
set -euo pipefail

MYONLINE_REPO="${MYONLINE_REPO:-tuffysan/myonline-tv-lxc}"
MYONLINE_CHANNEL="${MYONLINE_CHANNEL:-stable}"
# Friendly VERSION=34.4.0 is accepted as an alias for MYONLINE_REF=v34.4.0.
if [[ -z "${MYONLINE_REF:-}" && -n "${VERSION:-}" ]]; then
  MYONLINE_REF="${VERSION}"
fi
MYONLINE_REF="${MYONLINE_REF:-}"

normalize_ref() {
  local ref="${1:-}"
  [[ -n "$ref" ]] || return 0
  if [[ "$ref" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.-]+)?$ ]]; then
    printf 'v%s\n' "$ref"
  else
    printf '%s\n' "$ref"
  fi
}

github_latest_release_tag() {
  local repo="$1" tag=""
  tag="$(curl -fsSL --retry 3 --connect-timeout 15 -H 'Accept: application/vnd.github+json' \
    "https://api.github.com/repos/${repo}/releases/latest" 2>/dev/null \
    | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1 || true)"
  if [[ -n "$tag" ]]; then printf '%s\n' "$tag"; return; fi
  local effective
  effective="$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/${repo}/releases/latest" 2>/dev/null || true)"
  if [[ -n "$effective" && "$effective" == *"/tag/"* ]]; then basename "$effective"; fi
}

resolve_ref() {
  if [[ -n "$MYONLINE_REF" ]]; then normalize_ref "$MYONLINE_REF"; return; fi
  if [[ "$MYONLINE_CHANNEL" == "stable" ]]; then
    local tag
    tag="$(github_latest_release_tag "$MYONLINE_REPO")"
    if [[ -n "$tag" ]]; then printf '%s\n' "$tag"; return; fi
    echo "ERROR: No published GitHub Release exists for ${MYONLINE_REPO}." >&2
    echo "Publish a release first with PUBLISH.cmd, or explicitly use MYONLINE_REF=main for development mode." >&2
    return 1
  fi
  printf 'main\n'
}

download_repo() {
  local repo="$1" ref="$2" target="$3" archive="${target}/repo.tar.gz"
  mkdir -p "$target"
  echo "Downloading deployment source ${repo}@${ref}..." >&2
  if [[ "$ref" == "main" ]]; then
    curl -fL --retry 3 --connect-timeout 15 "https://github.com/${repo}/archive/refs/heads/main.tar.gz" -o "$archive"
  else
    curl -fL --retry 3 --connect-timeout 15 "https://github.com/${repo}/archive/refs/tags/${ref}.tar.gz" -o "$archive"
  fi
  tar -xzf "$archive" -C "$target"
  local dir
  dir="$(find "$target" -mindepth 1 -maxdepth 1 -type d | head -1)"
  [[ -n "$dir" ]] || { echo "Could not locate extracted repository." >&2; return 1; }
  printf '%s\n' "$dir"
}

release_asset_error() {
  local ref="$1" name="$2"
  echo "ERROR: GitHub release ${ref} is missing '${name}'." >&2
  echo "Verify GitHub Actions -> Release completed successfully." >&2
}

download_release_artifact() {
  local repo="$1" ref="$2" target="$3"
  local version="${ref#v}"; version="${version#.}"
  local name="myonline-tv-web-v${version}-linux-x64.tar.gz" sums="SHA256SUMS-RELEASE.txt"
  local base="https://github.com/${repo}/releases/download/${ref}"
  mkdir -p "$target"
  echo "Downloading verified release artifact ${name}..." >&2
  curl -fL --retry 3 --connect-timeout 15 "${base}/${name}" -o "${target}/${name}" || { release_asset_error "$ref" "$name"; return 1; }
  curl -fL --retry 3 --connect-timeout 15 "${base}/${sums}" -o "${target}/${sums}" || { release_asset_error "$ref" "$sums"; return 1; }
  [[ -s "${target}/${name}" && -s "${target}/${sums}" ]] || { echo "ERROR: Empty release download." >&2; return 1; }
  (cd "$target"; grep -F "  ${name}" "$sums" | tail -1 | sha256sum -c - >&2)
  printf '%s\n' "${target}/${name}"
}

select_rootfs_storage() {
  local requested="${1:-auto}"
  if [[ "$requested" != "auto" && -n "$requested" ]]; then printf '%s\n' "$requested"; return; fi
  local storage
  storage="$(pvesm status -content rootdir 2>/dev/null | awk 'NR>1 && $3=="active" {print $1; exit}')"
  [[ -n "$storage" ]] || storage="$(pvesm status 2>/dev/null | awk 'NR>1 && $3=="active" {print $1; exit}')"
  [[ -n "$storage" ]] || { echo "ERROR: No active Proxmox storage found." >&2; return 1; }
  printf '%s\n' "$storage"
}

next_ctid() {
  if [[ -n "${CTID:-}" ]]; then printf '%s\n' "$CTID"; return; fi
  if command -v pvesh >/dev/null 2>&1; then
    local id; id="$(pvesh get /cluster/nextid 2>/dev/null || true)"
    if [[ "$id" =~ ^[0-9]+$ ]]; then printf '%s\n' "$id"; return; fi
  fi
  local id=100
  while pct status "$id" >/dev/null 2>&1; do id=$((id+1)); done
  printf '%s\n' "$id"
}

write_nginx_config() {
  local ctid="$1"
  pct exec "$ctid" -- bash -lc 'cat > /etc/nginx/sites-available/myonlinetv <<'"'"'NGINX'"'"'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 0;
    set $my_forwarded_proto $http_x_forwarded_proto;
    if ($my_forwarded_proto = "") { set $my_forwarded_proto $scheme; }
    set $my_forwarded_host $http_x_forwarded_host;
    if ($my_forwarded_host = "") { set $my_forwarded_host $host; }
    location / {
        proxy_pass http://127.0.0.1:5080;
        proxy_http_version 1.1;
        proxy_set_header Host $my_forwarded_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $my_forwarded_proto;
        proxy_set_header X-Forwarded-Host $my_forwarded_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
    }
}
NGINX
rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/myonlinetv /etc/nginx/sites-enabled/myonlinetv
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
systemctl is-active --quiet nginx'
}

set_container_hostname() {
  local ctid="$1" hostname_value="${2:-myonlinetv}"
  pct set "$ctid" --hostname "$hostname_value"
  pct exec "$ctid" -- bash -lc "printf '%s\\n' '$hostname_value' > /etc/hostname; hostname '$hostname_value' 2>/dev/null || true"
}
