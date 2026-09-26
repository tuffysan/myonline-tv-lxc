# MyOnline TV v41.2.8 — Subtitle Overlay Renderer

Fixes subtitles that could be discovered and selected but remained invisible.

- Fetches validated WebVTT with same-origin credentials.
- Parses WebVTT cues in the application.
- Renders active cues in a dedicated player overlay synchronized to video.currentTime.
- Shows explicit subtitle load errors instead of silently failing.
- Keeps audio-language selection and playback pipeline unchanged.
