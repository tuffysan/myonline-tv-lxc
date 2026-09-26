# MyOnlineTV v41.0.9 — VOD Seek Root Fix

Fixes forward/backward seeking in VOD after the v41.0.8 player layout correction.

## Root cause
Replacement HLS sessions use a local timeline beginning near zero, while the UI displays the absolute position in the movie or episode. The local HLS duration could therefore replace the real media duration and make the seek bar invalid.

## Fix
- Preserve the real movie/episode duration independently from the active HLS session.
- Display absolute playback position and total media duration.
- Translate seek-bar targets to absolute VOD positions before session handover.
- Use the same absolute seek path for ±10 seconds and keyboard left/right.
- Keep the v41.0.8 dedicated root playback surface unchanged.
- Keep existing buffering, recovery, Live TV and fullscreen behavior unchanged.
