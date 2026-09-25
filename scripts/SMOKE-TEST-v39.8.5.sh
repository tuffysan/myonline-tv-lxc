#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5080}"
EXPECTED_VERSION="${EXPECTED_VERSION:-39.8.5}"

echo "=== MyOnlineTV v${EXPECTED_VERSION} runtime smoke test ==="
echo "Base URL: ${BASE_URL}"

health="$(curl -fsS --max-time 15 "${BASE_URL}/health")"
ready="$(curl -fsS --max-time 15 "${BASE_URL}/ready")"

python3 - "$EXPECTED_VERSION" "$health" "$ready" <<'PY'
import json, sys
expected, health_raw, ready_raw = sys.argv[1:]
health=json.loads(health_raw)
ready=json.loads(ready_raw)
assert health.get('status') == 'ok', f"health status: {health}"
assert health.get('version') == expected, f"health version {health.get('version')} != {expected}"
assert ready.get('status') == 'ready', f"readiness status: {ready}"
assert ready.get('version') == expected, f"ready version {ready.get('version')} != {expected}"
print(f"PASS: /health reports {expected}")
print("PASS: /ready reports ready")
checks=ready.get('checks') or {}
for key in ('dataDirectory','secretKey','ffmpeg','authConfigured'):
    if key in checks:
        print(f"  {key}: {checks[key]}")
PY

echo "PASS: MyOnlineTV runtime smoke test"
