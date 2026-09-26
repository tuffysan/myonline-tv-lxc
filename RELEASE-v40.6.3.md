# MyOnline TV v40.6.3 — Smart Buffer Release Gate Fix

This maintenance release fixes the release gate without reducing the Smart VOD buffer.

## Changes
- Streaming Engine 2.0 legacy tests no longer require obsolete `maxBufferLength:90` / `maxMaxBufferLength:180` values.
- Smart VOD Buffering remains explicitly regression-tested at `maxBufferLength:120` and `maxMaxBufferLength:240`.
- Continuous VOD handover regression coverage from v40.6.2 is retained.

Run `RELEASE.cmd` and require the complete local release gate to pass before using this release as the base for v40.7.x.
