# MyOnline TV v41.0.13 — VOD Streaming Pipeline Fix

This release targets the runtime failure where VOD starts and then stops after a few seconds.

The core fix is server-side HLS delivery: `index.m3u8` is a growing playlist while FFmpeg produces the VOD stream, so it is now explicitly served with `no-store, no-cache, must-revalidate`. Segment files remain cacheable because they are immutable after creation.

Playback now waits for six 2-second segments before initial start, seek replacement waits for three segments, and hls.js gets a larger forward buffer/timeout. Runtime status includes whether FFmpeg is still running and the age of the newest generated segment.

Player geometry from v41.0.12 is intentionally unchanged.
