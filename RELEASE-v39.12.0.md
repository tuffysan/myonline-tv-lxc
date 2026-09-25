# MyOnlineTV v39.12.0 — Live TV 2.0

Live TV 2.0 improves the everyday channel-browsing and viewing flow without replacing the proven playback path.

## Highlights
- Favourites, Recent and On now channel views.
- Refresh Now/Next guide data directly from Live TV.
- Clear profile-scoped recent channels.
- Keyboard/remote mini-guide shortcut (G), fast previous/next zapping and fullscreen.
- Existing recording, favourites, playback compatibility fallback and provider visibility remain intact.

## Release quality
All existing regression/security/isolation tests remain mandatory. New Live TV 2.0 guards are added to the .NET ReleaseTests suite. Build/test/release/deployment remains Python-free.


## RC2 – Continue API Hardening
- Hardened Continue Watching profile-state persistence on Windows.
- Keeps all Continue mutations serialized and removes replace/move races from this state path.
- Added black-box regression coverage for optional Continue metadata and concurrent writes.
- Existing Live TV 2.0 and prior regression suites remain mandatory.
