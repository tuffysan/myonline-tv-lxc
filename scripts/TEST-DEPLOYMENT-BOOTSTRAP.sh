#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_VALUE="$(tr -d '[:space:]' < "$ROOT/VERSION")"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
mkdir -p "$T/release-src/scripts" "$T/bin"
printf '%s\n' "$VERSION_VALUE" > "$T/release-src/VERSION"
printf '{}\n' > "$T/release-src/release.json"
printf '#!/usr/bin/env bash\nexit 0\n' > "$T/release-src/scripts/install-local.sh"
printf '#!/usr/bin/env bash\nexit 0\n' > "$T/release-src/scripts/update-local.sh"
printf '#!/usr/bin/env bash\n' > "$T/release-src/scripts/github-common.sh"
tar -C "$T/release-src" -czf "$T/myonline-tv-lxc-v${VERSION_VALUE}-source.tar.gz" .
printf 'fake-app\n' > "$T/myonline-tv-web-v${VERSION_VALUE}-linux-x64.tar.gz"
(cd "$T" && sha256sum --text "myonline-tv-lxc-v${VERSION_VALUE}-source.tar.gz" "myonline-tv-web-v${VERSION_VALUE}-linux-x64.tar.gz" > SHA256SUMS-RELEASE.txt)
cat > "$T/bin/curl" <<MOCK
#!/bin/bash
set -e
url=""; out=""
while ((\$#)); do
  case "\$1" in
    -o) out="\$2"; shift 2;;
    -H|--connect-timeout|--retry) shift 2;;
    -*) shift;;
    *) url="\$1"; shift;;
  esac
done
if [[ "\$url" == *'/releases/latest'* ]]; then printf '{"tag_name":"v${VERSION_VALUE}"}\\n'; exit 0; fi
name="\${url##*/}"; cp "$T/\$name" "\$out"
MOCK
cat > "$T/bin/pct" <<'MOCK'
#!/bin/sh
exit 0
MOCK
cat > "$T/bin/bash" <<MOCK
#!/bin/sh
printf '%s\\n' "\$*" >> "$T/handoff.log"
exit 0
MOCK
chmod +x "$T/bin/"*
PATH="$T/bin:/usr/bin:/bin" /bin/bash "$ROOT/install-lxc.sh" > "$T/install.out"
PATH="$T/bin:/usr/bin:/bin" CTID=145 /bin/bash "$ROOT/update-from-github.sh" > "$T/update.out"
grep -q "Latest release: v${VERSION_VALUE}" "$T/install.out"
grep -q "Latest release: v${VERSION_VALUE}" "$T/update.out"
grep -q 'install-local.sh' "$T/handoff.log"
grep -q 'update-local.sh' "$T/handoff.log"
echo "Bootstrap integration test passed for install + update (v${VERSION_VALUE})."
