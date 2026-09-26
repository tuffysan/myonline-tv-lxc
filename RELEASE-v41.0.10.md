# MyOnline TV v41.0.10 — Smooth Playback & Fast Seek

Playback-focused release based on v41.0.9.

- Keeps the v41.0.8 root player layout and v41.0.9 absolute VOD timeline.
- Buffered seeks stay local in the browser and do not restart FFmpeg.
- Remote VOD seeks require one ready HLS segment instead of four.
- Seek readiness polling reduced from 180 ms to 75 ms.
- Seek debounce reduced from 220 ms to 80 ms.
- Seek replacement transcodes use FFmpeg `ultrafast` startup preset; normal playback remains `veryfast`.
- Seek timeout reduced to 15 seconds so failed provider seeks recover sooner.
- No Live TV or player layout changes.
