#!/usr/bin/env bash
set -euo pipefail
URL="${1:-http://127.0.0.1:5080/api/appliance/readiness}"
for i in {1..30}; do
  if curl -fsS --max-time 3 "$URL" >/dev/null; then echo "MyOnline TV ready"; exit 0; fi
  sleep 2
done
echo "Health check failed" >&2
exit 1
