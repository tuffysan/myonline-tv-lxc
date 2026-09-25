# MyOnlineTV v40.0.0 — MyOnlineTV Experience 2.0

## Milestone
v40 activates the common experience layer prepared in v39.19 instead of replacing the application with a separate UI implementation.

## Main surfaces
- Home
- Live TV
- Movies
- Series
- Search
- Downloads
- Profiles
- Settings

## Shared experience
- MediaCard / Hero / Rail / Navigation / Dialog from the v39.19 migration layer.
- New Player Chrome and Profile Shell contracts.
- Responsive device classes for mobile, tablet, desktop and TV.
- Keyboard/TV focus behavior and reduced-motion support.

## Playback
Continue Watching, Favorites, Live TV, Movies/Series/Episodes and Downloads remain routed through the shared playback architecture. v40 must not introduce separate playback implementations per screen.

## Compatibility
The v39 compatibility layer remains available during migration. This is deliberate so v40 can move surfaces incrementally without another destructive UI rewrite.

## Release policy
All previous release/security/regression tests remain. v40 tests are additive.

Intermediate release versions may be skipped when upgrading to a newer compatible release. Same-version releases and downgrades remain blocked.

Zero-Python build/test/release/deployment remains mandatory.

## Validation
Run:

    .\RELEASE.cmd

Do not publish v40.0.0 unless the complete gate passes.
