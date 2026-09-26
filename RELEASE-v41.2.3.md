# MyOnline TV v41.2.3 — Subtitle Sync & Presentation Fix

- Normalizes subtitle timestamps to the same zero-based media timeline using FFmpeg copyts/start_at_zero.
- Uses fix_sub_duration when converting embedded subtitle streams to WebVTT.
- Positions WebVTT cues in a subtitle safe area above player controls.
- Reapplies cue presentation after seek.
- Keeps Native Seek, VOD playback and Live TV pipelines unchanged.
