# v32.0.0 — Playback Engine & Diagnostics

- Adds a common playback decision component for Direct → HLS → FFmpeg fallback.
- Adds user-visible playback diagnostics based on live sessions, FFmpeg availability, source health and recent errors.
- Existing playback paths remain available while the common planner is introduced.
