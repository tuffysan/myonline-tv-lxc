#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:?Usage: install-local.sh <repo-dir>}"
VERSION="$(tr -d '[:space:]' < "${REPO_DIR}/VERSION")"
ARTIFACT="${MYONLINE_ARTIFACT:-}"

CTID="${CTID:-145}"
HOSTNAME="${HOSTNAME:-myonlinetv}"
STORAGE="${STORAGE:-local-lvm}"
BRIDGE="${BRIDGE:-vmbr0}"
MEMORY="${MEMORY:-2048}"
CORES="${CORES:-2}"
DISK="${DISK:-16}"
IP_CONFIG="${IP_CONFIG:-ip=dhcp}"
ROOT_PASSWORD="${ROOT_PASSWORD:-}"

echo "============================================================"
echo " MyOnline TV Web v${VERSION} - Proxmox LXC Installer"
echo "============================================================"
echo " CTID: ${CTID}  Hostname: ${HOSTNAME}"
echo " CPU: ${CORES}  RAM: ${MEMORY} MB  Disk: ${DISK} GB"
echo " Mode: $([[ -n "$ARTIFACT" ]] && echo 'prebuilt release' || echo 'source build')"
echo "============================================================"

[[ $EUID -eq 0 ]] || { echo "Run as root on Proxmox."; exit 1; }
command -v pct >/dev/null || { echo "pct not found."; exit 1; }
if pct status "$CTID" >/dev/null 2>&1; then
  echo "CT ${CTID} already exists. Use update-from-github.sh."
  exit 1
fi

echo "[1/9] Preparing Debian template..."
pveam update >/dev/null

HOST_ARCH="$(uname -m)"
case "$HOST_ARCH" in
  x86_64)
    TEMPLATE_ARCH="amd64"
    ;;
  aarch64|arm64)
    TEMPLATE_ARCH="arm64"
    ;;
  *)
    echo "Unsupported Proxmox host architecture: ${HOST_ARCH}"
    exit 1
    ;;
esac

echo "Host architecture     : ${HOST_ARCH}"
echo "Template architecture : ${TEMPLATE_ARCH}"

TEMPLATE="$(
  pveam available --section system |
  awk -v arch="$TEMPLATE_ARCH" '
    /debian-13-standard/ && $2 ~ ("_" arch "\\.tar\\.zst$") { print $2 }
  ' |
  tail -1
)"

if [[ -z "$TEMPLATE" ]]; then
  TEMPLATE="$(
    pveam available --section system |
    awk -v arch="$TEMPLATE_ARCH" '
      /debian-12-standard/ && $2 ~ ("_" arch "\\.tar\\.zst$") { print $2 }
    ' |
    tail -1
  )"
fi

[[ -n "$TEMPLATE" ]] || {
  echo "No Debian 12/13 LXC template found for architecture: ${TEMPLATE_ARCH}"
  exit 1
}

case "$TEMPLATE" in
  *"_${TEMPLATE_ARCH}.tar.zst")
    ;;
  *)
    echo "Refusing to use template with unexpected architecture:"
    echo "  ${TEMPLATE}"
    exit 1
    ;;
esac

echo "Selected template     : ${TEMPLATE}"

LOCAL_TEMPLATE="local:vztmpl/$(basename "$TEMPLATE")"
if ! pveam list local | grep -qF "$(basename "$TEMPLATE")"; then
  pveam download local "$TEMPLATE"
fi

echo "[2/9] Creating CT ${CTID}..."
CREATE=(pct create "$CTID" "$LOCAL_TEMPLATE" --hostname "$HOSTNAME" --cores "$CORES" --memory "$MEMORY" --swap 512 --rootfs "$STORAGE:$DISK" --net0 "name=eth0,bridge=$BRIDGE,$IP_CONFIG" --unprivileged 1 --features nesting=1 --onboot 1 --start 1)
[[ -n "$ROOT_PASSWORD" ]] && CREATE+=(--password "$ROOT_PASSWORD")
"${CREATE[@]}"

CREATED_ARCH="$(pct config "$CTID" | awk -F': ' '/^arch:/ {print $2}')"
if [[ -n "$CREATED_ARCH" ]]; then
  case "$TEMPLATE_ARCH" in
    amd64)
      [[ "$CREATED_ARCH" == "amd64" ]] || {
        echo "Container architecture mismatch: expected amd64, got ${CREATED_ARCH}"
        echo "Destroying invalid CT ${CTID}."
        pct destroy "$CTID" --purge || true
        exit 1
      }
      ;;
    arm64)
      [[ "$CREATED_ARCH" == "arm64" ]] || {
        echo "Container architecture mismatch: expected arm64, got ${CREATED_ARCH}"
        echo "Destroying invalid CT ${CTID}."
        pct destroy "$CTID" --purge || true
        exit 1
      }
      ;;
  esac
fi

echo "[3/9] Waiting for container..."
for i in {1..60}; do pct exec "$CTID" -- true >/dev/null 2>&1 && break; sleep 2; done
pct exec "$CTID" -- true >/dev/null 2>&1 || { echo "Container did not become ready."; exit 1; }

echo "[4/9] Installing OS dependencies..."
pct exec "$CTID" -- bash -lc 'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl wget gnupg nginx ffmpeg tar'

echo "[5/9] Installing Microsoft .NET packages..."
pct exec "$CTID" -- bash -lc "
set -e
. /etc/os-release
wget -q \"https://packages.microsoft.com/config/debian/\${VERSION_ID}/packages-microsoft-prod.deb\" -O /tmp/packages-microsoft-prod.deb || true
if ! dpkg -i /tmp/packages-microsoft-prod.deb 2>/dev/null; then
  wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb
  dpkg -i /tmp/packages-microsoft-prod.deb
fi
apt-get update
"
if [[ -n "$ARTIFACT" ]]; then
  pct exec "$CTID" -- bash -lc 'DEBIAN_FRONTEND=noninteractive apt-get install -y aspnetcore-runtime-10.0'
else
  pct exec "$CTID" -- bash -lc 'DEBIAN_FRONTEND=noninteractive apt-get install -y dotnet-sdk-10.0'
fi

echo "[6/9] Installing MyOnline TV..."
pct exec "$CTID" -- mkdir -p /opt/myonlinetv/publish /opt/myonlinetv/src/wwwroot /var/lib/myonlinetv/downloads /var/lib/myonlinetv/backups
if [[ -n "$ARTIFACT" ]]; then
  pct push "$CTID" "$ARTIFACT" /tmp/myonline-tv-release.tar.gz
  pct exec "$CTID" -- bash -lc 'rm -rf /opt/myonlinetv/publish/* && tar -xzf /tmp/myonline-tv-release.tar.gz -C /opt/myonlinetv/publish && rm -f /tmp/myonline-tv-release.tar.gz'
else
  pct push "$CTID" "${REPO_DIR}/app/MyOnlineTV.Web.csproj" /opt/myonlinetv/src/MyOnlineTV.Web.csproj
  pct push "$CTID" "${REPO_DIR}/app/Program.cs" /opt/myonlinetv/src/Program.cs
  for f in "${REPO_DIR}"/app/wwwroot/*; do pct push "$CTID" "$f" "/opt/myonlinetv/src/wwwroot/$(basename "$f")"; done
  pct exec "$CTID" -- bash -lc 'cd /opt/myonlinetv/src && dotnet publish -c Release -o /opt/myonlinetv/publish'
fi

echo "[7/9] Configuring systemd..."
cat >/tmp/myonlinetv.service <<'UNIT'
[Unit]
Description=MyOnline TV Web
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/opt/myonlinetv/publish
ExecStart=/usr/bin/dotnet /opt/myonlinetv/publish/MyOnlineTV.Web.dll
Restart=always
RestartSec=3
User=www-data
Group=www-data
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=MYONLINE_DATA=/var/lib/myonlinetv
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=/var/lib/myonlinetv
UMask=0077

[Install]
WantedBy=multi-user.target
UNIT
pct push "$CTID" /tmp/myonlinetv.service /etc/systemd/system/myonlinetv.service
rm -f /tmp/myonlinetv.service

echo "Starting MyOnline TV service..."
pct exec "$CTID" -- bash -lc '
set -e
systemctl daemon-reload
systemctl enable myonlinetv
systemctl restart myonlinetv
systemctl is-active --quiet myonlinetv
'

echo "Configuring locale..."
pct exec "$CTID" -- bash -lc '
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y locales
sed -i "s/^# *en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/" /etc/locale.gen
grep -q "^en_US.UTF-8 UTF-8" /etc/locale.gen || echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
locale-gen en_US.UTF-8
update-locale LANG=en_US.UTF-8
'

echo "[8/9] Configuring Nginx..."
pct exec "$CTID" -- bash -lc 'cat > /etc/nginx/sites-available/myonlinetv <<'"'"'EOF'"'"'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 0;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    location / {
        proxy_pass http://127.0.0.1:5080;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/myonlinetv /etc/nginx/sites-enabled/myonlinetv

nginx -t
systemctl enable nginx
systemctl restart nginx
systemctl is-active --quiet nginx
'

echo "[9/9] Health and readiness checks..."
sleep 2
pct exec "$CTID" -- curl -fsS http://127.0.0.1:5080/health >/dev/null
pct exec "$CTID" -- curl -fsS http://127.0.0.1:5080/ready >/dev/null

IP="$(pct exec "$CTID" -- hostname -I | awk '{print $1}')"
echo

echo "Checking MyOnline TV backend on port 5080..."
pct exec "$CTID" -- bash -lc '
set -e
if ! curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1:5080/health >/tmp/myonlinetv-health.out; then
    echo "ERROR: MyOnline TV backend did not become healthy on port 5080."
    echo
    echo "=== systemctl status myonlinetv ==="
    systemctl status myonlinetv --no-pager || true
    echo
    echo "=== journalctl -u myonlinetv ==="
    journalctl -u myonlinetv -n 100 --no-pager || true
    echo
    echo "=== listening sockets ==="
    ss -lntp || true
    exit 1
fi

curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1:5080/ready >/tmp/myonlinetv-ready.out
'

echo "Checking Nginx reverse proxy on port 80..."
pct exec "$CTID" -- bash -lc '
set -e
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1/health >/tmp/myonlinetv-nginx-health.out
curl -fsS --retry 10 --retry-delay 1 --retry-connrefused http://127.0.0.1/ready >/tmp/myonlinetv-nginx-ready.out

if curl -fsS http://127.0.0.1/ | grep -qi "Welcome to nginx"; then
    echo "ERROR: Nginx default page is still being served instead of MyOnline TV."
    echo "Enabled sites:"
    ls -la /etc/nginx/sites-enabled/ || true
    echo "Effective default_server entries:"
    nginx -T 2>/dev/null | grep -n "default_server" || true
    exit 1
fi
'

echo "============================================================"
echo " MyOnline TV Web v${VERSION} installed"
echo " URL: http://${IP}/"
echo " CT : ${CTID}"
echo "============================================================"
echo "Open the URL and create the administrator account."
