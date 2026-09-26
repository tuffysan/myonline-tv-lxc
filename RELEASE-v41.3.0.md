# MyOnline TV v41.3.0 — Unified Media Timeline

- Subtitle timestamps preserve the source media PTS using FFmpeg `-copyts`.
- Removed the artificial `-output_ts_offset` correction that could double-shift cues.
- `video.currentTime` remains the playback master clock.
- Added manual subtitle sync control from -10.0s to +10.0s for provider/source timing errors.
- Existing audio language selection, native VOD seek, Live TV and playback recovery remain intact.
