# MyOnline TV v41.2.9 — Subtitle Fast-Start

- Fixes subtitle HTTP 504 caused by waiting for full VOD subtitle extraction.
- Subtitle endpoint seeks to the current playback position and streams a bounded 15-minute WebVTT window.
- Overlay renderer consumes WebVTT progressively and maps cue timestamps to the absolute video timeline.
- Playback, audio selection, native seek and Live TV are otherwise unchanged.
