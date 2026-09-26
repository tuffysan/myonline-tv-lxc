# MyOnlineTV v41.0.1 — Live Stream Generation Guard Fix

Hotfix for a Live TV regression introduced by the rapid-channel-switch generation guard.

## Fix
- `playLive()` now tears down the previous player/session before capturing the generation for the new start.
- Previously `destroyPlayer()` incremented `livePlaybackGeneration` after `playLive()` had captured it, so every Live TV start invalidated itself and returned immediately after `/api/live/start`.
- Live TV Reliability, reconnect, live-edge tuning and the v41 playback/UX quality stack remain enabled.
- Added a release regression assertion that requires generation capture to occur after player teardown.
