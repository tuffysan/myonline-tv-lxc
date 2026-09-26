# MyOnline TV v40.6.1 — Smart VOD Buffering

- Prebuffers 3 HLS segments before initial playback and 4 before seek handover.
- Uses 2-second VOD HLS segments for faster seek readiness.
- Expands HLS.js forward/back buffer targets and enables fragment prefetch.
- Shows buffered progress in the seek bar and monitors buffer health.
- Shortens stall detection while preserving automatic resume/recovery.
- Keeps the contained v40.5.1 player layout and v40.6.0 seamless session handover.
