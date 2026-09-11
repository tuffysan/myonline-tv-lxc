# v28.0.0 — Production Edition

v28.0.0 is a stabilization release. It introduces no mandatory cloud or paid service.

## Promotion checklist
- PUBLISH.cmd / .NET 10 build passes.
- Upgrade test on a disposable or recoverable LXC.
- Home, Live TV, Guide, Movies, Series, Library and DVR smoke test.
- Browser tests: mobile portrait/landscape, tablet portrait/landscape, desktop, TV/10-foot.
- Native Android TV build and playback smoke test.
- Long-running Live TV playback.
- DVR record -> file -> playback test.
- Backup/restore test.
- Provider credentials remain server-side.
- Mandatory MyOnline TV runtime cost remains 0 SEK.

`scripts/PRODUCTION-SMOKE-TEST.ps1` performs the basic unauthenticated reachability checks. Authenticated media tests still require a configured test installation.
