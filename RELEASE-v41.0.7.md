# MyOnlineTV v41.0.7 – Continue Watching Release Gate Fix

## Purpose
Release-gate correction for the v41.0.6 Continue Watching UX layout. No playback, buffering, seek, Live TV, or fullscreen behavior is changed.

## Fix
The contained VOD regression test now validates the current v41.0.6 layout contract instead of the obsolete v41.0.2 exact CSS selector. It verifies that:

- `#playerWrap` receives `dynamicMediaPlayer` when an existing player host is reused.
- The player spans the full content grid.
- The unified VOD player remains centered and capped at 1120 px.
- The Continue Watching UX from v41.0.6 remains intact.

## Release gate
This prevents a valid v41.0.6 layout improvement from being rejected merely because the selector was extended to include `#playerWrap.dynamicMediaPlayer`.
