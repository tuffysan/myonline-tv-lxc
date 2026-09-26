# MyOnline TV v41.1.1 — Playback Startup Fix

Playback startup regression fix. Live TV and VOD now use independent startup profiles.

- Live TV waits for one 1-second HLS segment instead of the VOD prebuffer threshold.
- Live HLS uses a small low-latency buffer and fast FFmpeg probing.
- VOD waits for two segments, then lets hls.js continue buffering during playback.
- VOD compatibility transcoding uses ultrafast startup.
- Direct VOD fallback timeout reduced so unsupported direct playback reaches HLS quickly.
- Playback layout is unchanged.
