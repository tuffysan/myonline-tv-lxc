# MyOnlineTV v41.0.3 – VOD Seek Timeline Fix

- Fixes HLS replacement seek so the browser playhead is reset to the new replacement timeline after the manifest is parsed.
- Keeps the absolute VOD position in `timelineOffset` while the replacement stream itself starts at relative time 0.
- Slider dragging now previews the target time and commits a single seek on change/release, avoiding repeated FFmpeg replacement sessions.
- Keeps v41.0.2 VOD recovery/buffering/layout fixes and v41.0.1 Live TV generation fix.
