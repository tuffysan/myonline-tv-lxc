# MyOnline TV v41.2.10 — Subtitle A/V Sync Fix

- Uses `video.currentTime` as the single subtitle/audio/video master clock.
- FFmpeg subtitle windows are emitted with absolute media timestamps using `-output_ts_offset`.
- Removes the client-side `+windowStart` timestamp approximation that caused subtitle drift.
- Reloads the selected subtitle window after seek and prefetches before the active window expires.
- Keeps the v41.2.9 fast-start subtitle pipeline and updater disk/backup safeguards.
- Playback, audio-language selection and Live TV behavior are otherwise unchanged.
