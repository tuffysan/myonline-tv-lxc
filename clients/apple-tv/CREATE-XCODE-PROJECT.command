#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v xcodegen >/dev/null 2>&1; then
  echo "XcodeGen is required to generate MyOnlineTV.xcodeproj."
  if command -v brew >/dev/null 2>&1; then
    echo "Installing XcodeGen with Homebrew..."
    brew install xcodegen
  else
    echo "Install Homebrew or XcodeGen, then run this script again."
    exit 1
  fi
fi
xcodegen generate
echo
echo "Created MyOnlineTV.xcodeproj"
open MyOnlineTV.xcodeproj
