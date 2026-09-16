#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo '[gate] Shell syntax...'
find . -name '*.sh' -print0 | xargs -0 -n1 bash -n

echo '[gate] Regression: no same-line nounset local expansion...'
if grep -R -nE 'local .*target="\$[0-9]".*\$\{target\}' --include='*.sh' .; then
  echo 'ERROR: unsafe local target expansion detected.' >&2
  exit 1
fi

echo '[gate] Bootstrap scripts are independent of github-common.sh...'
! grep -q 'github-common.sh' install-lxc.sh
! grep -q 'github-common.sh' update-from-github.sh

echo '[gate] Latest-release mode is the default...'
grep -q '/releases/latest' install-lxc.sh
grep -q '/releases/latest' update-from-github.sh

echo '[gate] Optional VERSION pin remains supported...'
grep -q 'REQUESTED_VERSION="${VERSION:-}"' install-lxc.sh
grep -q 'REQUESTED_VERSION="${VERSION:-}"' update-from-github.sh

echo '[gate] Release bundle checksum verification is mandatory...'
grep -q 'sha256sum -c' install-lxc.sh
grep -q 'sha256sum -c' update-from-github.sh

echo '[gate] Version metadata consistency...'
V="$(tr -d '[:space:]' < VERSION)"
JSON_V="$(python3 -c 'import json; print(json.load(open("release.json"))["version"])')"
ART="$(python3 -c 'import json; print(json.load(open("release.json"))["artifact"])')"
[[ "$V" == "$JSON_V" ]]
[[ "$ART" == "myonline-tv-web-v${V}-linux-x64.tar.gz" ]]

echo '[gate] Install/update bootstrap integration...'
bash scripts/TEST-DEPLOYMENT-BOOTSTRAP.sh

echo "Deployment gate passed for v${V}."

# Product version must come from VERSION -> assembly -> runtime API.
if grep -Eq 'version[[:space:]]*=[[:space:]]*"34\.[0-9]+\.[0-9]+"' app/Program.cs; then
  echo "ERROR: hard-coded product version found in app/Program.cs" >&2
  exit 1
fi
grep -Fq "ReadAllText('\$(MSBuildProjectDirectory)/../VERSION')" app/MyOnlineTV.Web.csproj || { echo "ERROR: csproj does not source VERSION" >&2; exit 1; }
