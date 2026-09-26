# MyOnline TV v41.0.11 — Playback Stabilization

Playback-only stabilization release based on v41.0.10.

- Confirms a real stall before recovery instead of reacting to every transient media event.
- Requires a small playable buffer before auto-resume to avoid pause/play oscillation.
- Adds recovery cooldown and staged HLS reload/media recovery.
- Faster recovery trigger (1.8 s) with progress-aware cancellation.
- Stronger HLS fragment/manifest retry and timeout policy.
- Raises VOD buffer byte ceiling to 160 MB while retaining the adaptive time-based buffer.
- Preserves v41.0.8 player layout, v41.0.9 absolute timeline, and v41.0.10 fast seek.
