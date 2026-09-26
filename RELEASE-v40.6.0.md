# MyOnline TV v40.6.0 — Continuous VOD Playback Engine

- Seek replacement streams are prepared before the active stream is torn down.
- The current video frame remains visible while a seek session starts.
- The previous FFmpeg/HLS session is stopped only after the replacement is ready and attached.
- VOD startup no longer kills an existing user VOD session pre-emptively.
- Playback recovery resumes after transient buffering unless the user intentionally paused.
- Contained v40.5.1 player layout is unchanged.
