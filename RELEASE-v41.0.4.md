# MyOnlineTV v41.0.4 — VOD Buffer Pipeline Fix

- Fixes browser-generated VOD pauses becoming unrecoverable during buffer underruns.
- Buffer monitor is now telemetry-only and no longer overwrites healthy playback with misleading replenishing/building-buffer messages.
- Recovery can continue while the media element is browser-paused, restarts HLS loading, and automatically resumes playback when data returns.
- Recovery escalation begins after 5 seconds instead of leaving a paused player waiting indefinitely.
- Adaptive-buffer stall pressure now decays after the buffer has recovered instead of permanently treating a session as unstable.
- Keeps v41.0.3 seek timeline fix, v41.0.2 VOD pipeline/layout fixes, and v41.0.1 Live TV generation fix.
