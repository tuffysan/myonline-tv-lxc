# MyOnline TV v41.2.0 — Native Seek & Smart Playback Pipeline

Playback-first release. Browser-compatible VOD now keeps one direct media resource attached and seeks natively using HTTP byte ranges instead of creating replacement FFmpeg/HLS sessions. HLS transcoding remains the compatibility fallback for unsupported containers/codecs.

## Playback contract
- Direct Play is preferred for compatible MP4/M4V/MOV/WebM codecs.
- Native seek uses `fastSeek()` when available, otherwise `currentTime`; the existing `/api/proxy/{token}` Range/206 path serves the requested bytes.
- Native seeks never create `/api/media/start` replacement sessions.
- Duration from ffprobe is exposed immediately to the player.
- HLS replacement seek remains only for compatibility-transcoded playback.
- Live TV startup profile is unchanged.
