# v36.5.4 – Atomic Release Draft-ID Fix

This release fixes the v36.5.3 GitHub Actions publication failure. Draft releases are not looked up through the public tag endpoint. The workflow now resolves the draft release ID, uploads and verifies all mandatory assets against that ID, and only then publishes the release as Latest.

Mandatory assets:
- myonline-tv-web-v36.5.4-linux-x64.tar.gz
- myonline-tv-lxc-v36.5.4-source.tar.gz
- SHA256SUMS-RELEASE.txt
- release.json
