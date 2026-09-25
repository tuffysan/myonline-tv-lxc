# MyOnlineTV v39.17.0 — Downloads 2.1

## Goal
Improve the download experience around queue state, offline library, retry/recovery, storage and episode organization without weakening profile isolation.

## Included
- Normalized queue/progress model.
- Retry eligibility with a bounded retry count.
- Exponential retry delay capped at 30 seconds.
- Storage usage, partial-download usage and free-space calculations.
- Offline library containing completed downloads only.
- Series/episode grouping and ordering.
- Cleanup candidate calculation for older completed entries and stale failed entries.
- Profile-scoped filtering.
- Offline playback through Playback Engine 3.0.

## Security / isolation
Downloads remain profile scoped in the UI model, while existing server-side authorization and multi-user isolation remain the security boundary.

## Regression policy
All existing tests from v39.16.0 and earlier remain. New Downloads 2.1 .NET checks are additive.

The v39.13.1 updater backup/three-backup-retention tests remain permanent.

Zero-Python build/test/release/deployment remains mandatory.

## Validation
Run:

    .\RELEASE.cmd

Do not publish v39.17.0 unless the complete gate passes.
