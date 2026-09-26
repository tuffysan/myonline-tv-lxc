# MyOnline TV v40.4.0 — VOD Seek & A/V Sync Engine

This release replaces unreliable long-distance seeking in generated HLS VOD with server-assisted seeking. The player exposes the full probed duration. When the viewer seeks outside the currently generated stream, playback is restarted at that source timestamp and the player maintains an absolute timeline offset.

FFmpeg seek sessions use compatibility transcoding with generated timestamps, regular keyframes and audio clock resampling to reduce freezes and A/V desynchronization after seeking. Direct browser-compatible VOD keeps native byte-range playback.
