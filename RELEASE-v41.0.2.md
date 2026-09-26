# MyOnlineTV v41.0.2 — VOD Playback Recovery & Layout Fix

- Fast VOD startup: one ready HLS segment is sufficient before attaching playback.
- Continuous buffering: 60 s normal HLS target, 15 s low-water UX threshold, up to 240 s maximum.
- Fixes a recovery bug where browser-generated pause events during buffering could be mistaken for an intentional user pause, disabling automatic recovery.
- Adds stronger HLS fragment/manifest retry policy.
- Restores the contained centered VOD player on desktop and forces dynamically inserted player hosts to span the full content grid.
- Live TV generation-guard fix from v41.0.1 is retained.
