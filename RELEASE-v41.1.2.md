# MyOnline TV v41.1.2 — Instant VOD Seek

Playback-first patch for Movies and Series seeking.

- HLS seek becomes ready after one segment instead of three.
- Seek sessions use 1 second HLS segments and 1 second forced-keyframe cadence.
- Seek startup timeout reduced to 7 seconds with 50 ms readiness polling.
- Replacement playback starts loading at the beginning of its new seek timeline.
- The Seeking UI is cleared on the real `playing` event and has a bounded failsafe.
- HLS status reports buffered seconds using the session's actual segment duration.
- Normal VOD startup remains 2 second segments; Live TV remains on its separate fast-start profile.
