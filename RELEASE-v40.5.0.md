# MyOnline TV v40.5.0 — Unified Video Player

Rebuilds the VOD player around one shared inline/fullscreen surface.

- Video owns the complete 16:9 stage.
- Seek, time, title, status, play/pause and fullscreen controls are overlays.
- Controls auto-hide during playback and reappear on pointer/touch activity.
- Inline and fullscreen use the same DOM and layout.
- Click/space/K toggles playback; double-click/F toggles fullscreen; arrows seek 10 seconds.
- Existing v40.4.x VOD seek/restart and A/V sync engine is retained.
- Release regression tests now gate the unified player structure and CSS.
