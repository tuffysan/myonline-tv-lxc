# v30.1.0 — Admin Production Edition

The Admin redesign is consolidated into a production-oriented release.

## Acceptance checklist
- Overview provides actionable health status.
- Sources are understandable without knowing API endpoints.
- DVR conflicts and failed recordings are visible.
- Storage utilization and recording paths are clear.
- Users, profiles, paired devices and rooms are manageable.
- Diagnostics expose useful latency/cache/provider/FFmpeg information.
- Update flow creates/verifies a backup before upgrade.
- Rollback remains available after failed health check.
- Admin is usable from a phone while standing in front of the TV.
- Mandatory MyOnline TV runtime cost remains 0 SEK.

Run `scripts/ADMIN-PRODUCTION-SMOKE-TEST.ps1` against a configured installation after publishing.
