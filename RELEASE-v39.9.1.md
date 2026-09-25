# MyOnlineTV v39.9.1 — Playback Regression & Release Gate

Stabilization release for Downloads 2.0. Fixes playback entry points from Continue Watching and Favourites and adds release guards for critical playback surfaces.

## Fixes
- IPTV movie favourites now start playback instead of being routed through the unified-library player.
- TV and desktop My List cards use the same favourite playback resolver as mobile/tablet.
- Older Continue Watching rows can be rehydrated from the current profile's scoped history/favourites when stable playback metadata is missing.
- Series favourites continue to open the series episode chooser because a series favourite does not identify one episode.

## Release gate
- Static playback-surface regression guard.
- Existing Continue Watching API, multi-user isolation, Downloads 2.0, version and production gates remain mandatory.
