# MyOnline TV v41.2.5 — Audio Language Selection

Adds selectable embedded audio tracks for Movies and Series when a source contains multiple audio streams.

- ffprobe discovers audio stream index, language, title, codec, channels and default disposition.
- The player shows an Audio language selector only when more than one track exists.
- Changing audio keeps the current playback position and starts the compatibility HLS pipeline with the selected audio stream.
- Selected audio is mapped explicitly by FFmpeg and normalized to AAC for browser compatibility.
- Single-audio-track media keeps the existing UI unchanged.
- Live TV is unchanged.
