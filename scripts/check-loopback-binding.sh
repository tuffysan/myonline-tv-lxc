#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROGRAM="$ROOT/app/Program.cs"
EXPECTED='builder.WebHost.UseUrls("http://127.0.0.1:5080");'
if ! grep -Fq "$EXPECTED" "$PROGRAM"; then
  echo "ERROR: Program.cs must bind Kestrel to 127.0.0.1:5080" >&2
  exit 1
fi
if grep -Fq '129.0.0.1:5080' "$PROGRAM"; then
  echo "ERROR: invalid 129.0.0.1 Kestrel binding detected" >&2
  exit 1
fi
echo "Kestrel loopback binding: OK"
