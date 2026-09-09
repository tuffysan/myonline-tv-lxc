#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:?Usage: install-local.sh <repo-dir>}"
VERSION="$(tr -d '[:space:]' < "${REPO_DIR}/VERSION")"

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
echo " CTID      : ${CTID}"
echo " Hostname  : ${HOSTNAME}"
echo " Storage   : ${STORAGE}"
echo " CPU       : ${CORES}"
echo " Memory    : ${MEMORY} MB"
echo " Disk      : ${DISK} GB"
echo " Network   : ${IP_CONFIG}"
echo "============================================================"

[[ $EUID -eq 0 ]] || { echo "Run as root on the Proxmox host."; exit 1; }
command -v pct >/dev/null || { echo "pct was not found. Run this on a Proxmox VE host."; exit 1; }
command -v pveam >/dev/null || { echo "pveam was not found."; exit 1; }

if pct status "$CTID" >/dev/null 2>&1; then
  echo "CT ${CTID} already exists."
  echo "Use update-from-github.sh for an existing MyOnline TV installation."
  exit 1
fi

echo "[1/9] Finding Debian LXC template..."
pveam update >/dev/null
TEMPLATE="$(pveam available --section system | awk '/debian-13-standard/ {print $2}' | tail -1)"
if [[ -z "$TEMPLATE" ]]; then
  TEMPLATE="$(pveam available --section system | awk '/debian-12-standard/ {print $2}' | tail -1)"
fi
[[ -n "$TEMPLATE" ]] || { echo "No Debian 12/13 standard template found."; exit 1; }

LOCAL_TEMPLATE="local:vztmpl/$(basename "$TEMPLATE")"
if ! pveam list local | grep -q "$(basename "$TEMPLATE")"; then
  echo "[2/9] Downloading ${TEMPLATE}..."
  pveam download local "$TEMPLATE"
else
  echo "[2/9] Debian template already available."
fi

echo "[3/9] Creating LXC CT ${CTID}..."
CREATE=(
  pct create "$CTID" "$LOCAL_TEMPLATE"
  --hostname "$HOSTNAME"
  --cores "$CORES"
  --memory "$MEMORY"
  --swap 512
  --rootfs "$STORAGE:$DISK"
  --net0 "name=eth0,bridge=$BRIDGE,$IP_CONFIG"
  --unprivileged 1
  --features nesting=1
  --onboot 1
  --start 1
)
if [[ -n "$ROOT_PASSWORD" ]]; then CREATE+=(--password "$ROOT_PASSWORD"); fi
"${CREATE[@]}"

echo "[4/9] Waiting for container..."
for i in {1..60}; do
  if pct exec "$CTID" -- true >/dev/null 2>&1; then break; fi
  sleep 2
done
pct exec "$CTID" -- true >/dev/null 2>&1 || { echo "Container did not become ready."; exit 1; }

echo "[5/9] Installing OS dependencies..."
pct exec "$CTID" -- bash -lc \
  'apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl wget gnupg nginx unzip rsync ffmpeg'

echo "[6/9] Installing .NET 10 SDK..."
pct exec "$CTID" -- bash -lc '
set -e
. /etc/os-release
wget -q "https://packages.microsoft.com/config/debian/${VERSION_ID}/packages-microsoft-prod.deb" -O /tmp/packages-microsoft-prod.deb || true
if ! dpkg -i /tmp/packages-microsoft-prod.deb 2>/dev/null; then
  wget -q https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb
  dpkg -i /tmp/packages-microsoft-prod.deb
fi
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y dotnet-sdk-10.0
'

echo "[7/9] Uploading and publishing MyOnline TV..."
pct exec "$CTID" -- mkdir -p /opt/myonlinetv/src/wwwroot /opt/myonlinetv/publish /var/lib/myonlinetv/downloads
pct push "$CTID" "${REPO_DIR}/app/MyOnlineTV.Web.csproj" /opt/myonlinetv/src/MyOnlineTV.Web.csproj
pct push "$CTID" "${REPO_DIR}/app/Program.cs" /opt/myonlinetv/src/Program.cs
for f in "${REPO_DIR}"/app/wwwroot/*; do
  pct push "$CTID" "$f" "/opt/myonlinetv/src/wwwroot/$(basename "$f")"
done
pct exec "$CTID" -- bash -lc \
  'rm -rf /opt/myonlinetv/publish/* && cd /opt/myonlinetv/src && dotnet publish -c Release -o /opt/myonlinetv/publish'

echo "[8/9] Installing systemd and Nginx..."
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

cat >/tmp/myonlinetv.nginx <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 4g;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;

    location / {
        proxy_pass http://127.0.0.1:5080;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX
pct push "$CTID" /tmp/myonlinetv.nginx /etc/nginx/sites-available/myonlinetv
rm -f /tmp/myonlinetv.nginx

pct exec "$CTID" -- bash -lc "
set -e
printf '%s\n' '${VERSION}' >/var/lib/myonlinetv/version
chown -R www-data:www-data /var/lib/myonlinetv /opt/myonlinetv
chmod 700 /var/lib/myonlinetv
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/myonlinetv /etc/nginx/sites-enabled/myonlinetv
nginx -t
systemctl daemon-reload
systemctl enable --now myonlinetv nginx
"

echo "[9/9] Running health check..."
sleep 2
pct exec "$CTID" -- curl -fsS http://127.0.0.1:5080/api/status >/dev/null

IP="$(pct exec "$CTID" -- hostname -I | awk '{print $1}')"
echo
echo "============================================================"
echo " MyOnline TV Web installation completed"
echo "============================================================"
echo " Version : ${VERSION}"
echo " CTID    : ${CTID}"
echo " URL     : http://${IP}/"
echo " Data    : /var/lib/myonlinetv"
echo
echo "Open the URL and create the administrator account."
echo "For Internet access, add HTTPS and preferably Tailscale/VPN."
echo
echo "Logs:"
echo "  pct exec ${CTID} -- journalctl -u myonlinetv -f"
echo "============================================================"
