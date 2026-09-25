# MyOnlineTV v39.9.0 — Downloads 2.0

Downloads 2.0 turns server-side downloads into a persistent manager rather than transient background tasks.

## Highlights
- Persistent queue and history
- Live progress and real cancellation
- Retry failed/cancelled jobs
- Batch API for series/episode downloads
- Storage usage and status summary
- Per-user isolation for queue, files, history and actions
- Improved one-click release dashboard with current GitHub Actions job and step

## Release gate
Run `RELEASE.cmd`. It builds, runs regression/security/version gates, publishes main/tag, follows GitHub Actions step-by-step and verifies all release assets.
