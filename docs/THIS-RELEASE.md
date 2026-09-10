# MyOnline TV v0.5.5 — Reliability & Recovery

## Reliability
GET requests retry up to three times for transient network errors and HTTP 429/502/503/504. Retries use progressive delays. Long-running Movies catalogue requests keep their existing custom timeout.

## Recovery
System → Run recovery cleans exited Live/FFmpeg sessions and stale HLS folders older than 12 hours. Active streams are not touched.

## Diagnostics
System now displays:
- catalogue cache size and file count
- latest successful catalogue refreshes
- recent tracked provider/catalogue errors
- active Live streams and existing runtime information

## Publishing
From this release onward use only:

    PUBLISH.cmd

The script reads VERSION, commits changes, pushes main, safely handles the release tag and pushes it to trigger GitHub Actions. The same script is intended for all future versions.
