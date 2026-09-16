#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
find . -name '*.sh' -print0 | xargs -0 -n1 bash -n
# Regression gate: download_repo must be callable under nounset without target expansion failure.
source scripts/github-common.sh
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Stub network/extraction commands so only shell initialization/argument handling is tested.
curl(){ local out=''; while (($#)); do if [[ "$1" == '-o' ]]; then out="$2"; shift 2; else shift; fi; done; [[ -n "$out" ]] && : > "$out"; }
tar(){ :; }
find(){ printf '%s\n' "$TMP/source/fake"; }
mkdir -p "$TMP/source/fake"
result="$(download_repo 'owner/repo' 'v1.2.3' "$TMP/source")"
[[ "$result" == "$TMP/source/fake" ]]
[[ "$(normalize_ref 35.0.1)" == 'v35.0.1' ]]
[[ "$(normalize_ref v35.0.1)" == 'v35.0.1' ]]
echo 'Deployment gate passed.'
