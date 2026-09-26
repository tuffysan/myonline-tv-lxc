# MyOnline TV v41.2.4 — Subtitle Visibility & Timeline Fix

- Fixes the v41.2.3 regression where selecting a subtitle could result in no visible cues.
- Removes `-copyts -start_at_zero` from subtitle extraction because it could move WebVTT cues away from the HTML video element's media-relative timeline.
- Uses generated monotonic timestamps while preserving progressive WebVTT delivery.
- Keeps subtitle extraction subtitle-only (`-vn -an`) to reduce unnecessary work.
- Retries a failed HTML track resource when the user explicitly selects it.
- Repositions cues into a safer area above the player controls.
- Keeps Native Seek, VOD playback and Live TV pipelines unchanged.
