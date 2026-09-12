#!/usr/bin/env bash
set -euo pipefail
base="${1:-http://127.0.0.1:5080}"
echo "[1/4] health"; curl -fsS "$base/health" >/dev/null
echo "[2/4] ready"; curl -fsS "$base/ready" >/dev/null
echo "[3/4] database file"
test -s /var/lib/myonlinetv/myonlinetv.db
echo "[4/4] sqlite backup"
cp -a /var/lib/myonlinetv/myonlinetv.db "/var/lib/myonlinetv/backups/db-$(date +%Y%m%d-%H%M%S).sqlite"
echo "Stability check passed."
