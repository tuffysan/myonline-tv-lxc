# MyOnline TV v40.3.0 – Streaming Engine 2.0

This release rebuilds VOD delivery around native HTTP byte-range playback where the browser can play the source directly, with HLS/FFmpeg as compatibility fallback. It also separates ordinary buffering from recovery, improves duration/seek behavior, and keeps resume state independent of stream recovery.
