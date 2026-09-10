#!/usr/bin/env bash
set -euo pipefail

release_asset_error() {
  local ref="$1"
  local name="$2"
  echo "ERROR: GitHub release ${ref} exists, but required asset '${name}' is missing." >&2
  echo "Open GitHub -> Actions -> Release and verify the workflow completed successfully." >&2
  echo "A valid release must contain the prebuilt linux-x64 archive, source archive, SHA256SUMS-RELEASE.txt and release.json." >&2
}


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
  version="${version#.}"
  local name="myonline-tv-web-v${version}-linux-x64.tar.gz"
  local sums="SHA256SUMS-RELEASE.txt"
  local base="https://github.com/${repo}/releases/download/${ref}"

  mkdir -p "$target"

  echo "Downloading prebuilt ${name}..." >&2
  if ! curl -fL --retry 3 --connect-timeout 15 \
      "${base}/${name}" -o "${target}/${name}"; then
    release_asset_error "${ref}" "${name}"
    return 1
  fi

  if [[ ! -s "${target}/${name}" ]]; then
    echo "ERROR: Downloaded release asset '${name}' is empty." >&2
    return 1
  fi

  echo "Downloading ${sums}..." >&2
  if ! curl -fL --retry 3 --connect-timeout 15 \
      "${base}/${sums}" -o "${target}/${sums}"; then
    release_asset_error "${ref}" "${sums}"
    return 1
  fi

  if [[ ! -s "${target}/${sums}" ]]; then
    echo "ERROR: Downloaded checksum file '${sums}' is empty." >&2
    return 1
  fi

  (
    cd "$target"
    local checksum_line
    checksum_line="$(grep -F "  ${name}" "$sums" | tail -n 1 || true)"
    if [[ -z "$checksum_line" ]]; then
      echo "ERROR: ${sums} does not contain a checksum for ${name}." >&2
      exit 1
    fi
    printf '%s\n' "$checksum_line" | sha256sum -c - >&2
  )

  printf '%s\n' "${target}/${name}"
}

write_nginx_config() {
  local ctid="$1"
  pct exec "$ctid" -- bash -lc 'cat > /etc/nginx/sites-available/myonlinetv <<'"'"'EOF'"'"'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 0;

    # Preserve the original external scheme and host from an upstream reverse proxy
    # (for example Nginx Proxy Manager). Direct LAN HTTP requests fall back to the
    # host/scheme received by this local Nginx instance.
    set $my_forwarded_proto $http_x_forwarded_proto;
    if ($my_forwarded_proto = "") {
        set $my_forwarded_proto $scheme;
    }

    set $my_forwarded_host $http_x_forwarded_host;
    if ($my_forwarded_host = "") {
        set $my_forwarded_host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:5080;
        proxy_http_version 1.1;

        # Keep all proxy_set_header directives in this location. Nginx only inherits
        # proxy_set_header directives when none are defined at the current level.
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
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/myonlinetv /etc/nginx/sites-enabled/myonlinetv
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx
systemctl is-active --quiet nginx
'
}

set_container_hostname() {
  local ctid="$1"
  local hostname_value="${2:-MyOnlineTV}"

  pct set "$ctid" --hostname "$hostname_value"

  pct exec "$ctid" -- bash -lc "
set -e
printf '%s\n' '$hostname_value' > /etc/hostname
if grep -qE '^127\.0\.1\.1[[:space:]]+' /etc/hosts; then
  sed -i -E 's/^127\.0\.1\.1[[:space:]]+.*/127.0.1.1 ${hostname_value}/' /etc/hosts
else
  printf '127.0.1.1 %s\n' '$hostname_value' >> /etc/hosts
fi
hostname '$hostname_value' 2>/dev/null || true
"
}
