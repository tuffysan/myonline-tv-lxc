#!/usr/bin/env bash
set -euo pipefail
if [[ ${EUID} -ne 0 ]]; then echo "Run as root inside the MyOnline TV LXC"; exit 1; fi
apt-get update
apt-get install -y python3 python3-venv
install -d -m 0755 /opt/myonlinetv/youtube-bridge
python3 -m venv /opt/myonlinetv/youtube-bridge/venv
/opt/myonlinetv/youtube-bridge/venv/bin/pip install --upgrade yt-dlp
install -m 0644 "$(dirname "$0")/server.py" /opt/myonlinetv/youtube-bridge/server.py
install -m 0644 "$(dirname "$0")/myonlinetv-youtube-bridge.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now myonlinetv-youtube-bridge.service
curl -fsS http://127.0.0.1:5089/health
echo
echo "Restart MyOnline TV after deploying the updated app."
