# MyOnline TV v41.1.0 — Playback Core

Playback is the primary product function. This release consolidates VOD playback around a simple reliability policy:

- Direct Play is preferred for browser-compatible containers/codecs, including resume.
- Direct Play is accepted only after the video actually reaches `playing`, not merely `loadedmetadata`.
- Server fallback always normalizes to H.264/AAC HLS for predictable browser playback.
- FFmpeg reconnects transient HTTP inputs.
- HLS uses EVENT playlists and atomic temporary segment publication.
- Resume no longer forces transcoding when Direct Play can seek with HTTP ranges.
- HLS buffering is bounded to a practical 60/120 second forward window.

Player layout from v41.0.12 is unchanged.
