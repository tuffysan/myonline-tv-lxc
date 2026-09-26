# MyOnline TV v40.2.1 — Playback Resilience & Resume Fix

This maintenance release improves VOD buffering recovery and Continue Watching resume reliability.

## Changes
- Recover HLS network and media errors without resetting playback to the beginning.
- Persist playback position during buffering/stalls and browser/page transitions.
- Restore the saved position once media metadata is available.
- Preserve position if playback falls back to H.264/AAC compatibility transcoding.
- Remove items from Continue Watching when at least 95% complete.

Home Experience 3.1 remains version 40.2.0.
