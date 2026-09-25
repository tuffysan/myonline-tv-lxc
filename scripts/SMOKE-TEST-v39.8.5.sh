#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5080}"
EXPECTED_VERSION="${EXPECTED_VERSION:-39.8.5}"

echo "=== MyOnlineTV v${EXPECTED_VERSION} runtime smoke test ==="
echo "Base URL: ${BASE_URL}"

health="$(curl -fsS --max-time 15 "${BASE_URL}/health")"
ready="$(curl -fsS --max-time 15 "${BASE_URL}/ready")"

health_status="$(printf '%s' "$health" | sed -nE 's/.*"status"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' | head -n1)"
health_version="$(printf '%s' "$health" | sed -nE 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' | head -n1)"
ready_status="$(printf '%s' "$ready" | sed -nE 's/.*"status"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' | head -n1)"
ready_version="$(printf '%s' "$ready" | sed -nE 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' | head -n1)"

[[ "$health_status" == "ok" ]] || { echo "ERROR: /health status is '$health_status'" >&2; exit 1; }
[[ "$health_version" == "$EXPECTED_VERSION" ]] || { echo "ERROR: /health version '$health_version' != '$EXPECTED_VERSION'" >&2; exit 1; }
[[ "$ready_status" == "ready" ]] || { echo "ERROR: /ready status is '$ready_status'" >&2; exit 1; }
[[ "$ready_version" == "$EXPECTED_VERSION" ]] || { echo "ERROR: /ready version '$ready_version' != '$EXPECTED_VERSION'" >&2; exit 1; }

echo "PASS: /health reports $EXPECTED_VERSION"
echo "PASS: /ready reports ready"

echo "PASS: MyOnlineTV runtime smoke test"
