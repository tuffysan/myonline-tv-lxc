# MyOnline TV v41.2.7 — Subtitle Pipeline Fix

- Replaces progressive FFmpeg subtitle piping with finite validated WebVTT extraction.
- Maps the exact ffprobe subtitle stream index selected by the user.
- Validates the WEBVTT header before publishing a subtitle resource.
- Sends Content-Length and a finite response so HTML track loading reaches LOADED reliably.
- Adds a short-lived subtitle cache to avoid repeatedly extracting the same track.
- Adds client load/error handling and stable stream-index based selection.
- Keeps v41.2.6 Home layout, v41.2.5 audio selection, native seek and Live TV behavior unchanged.
