# MyOnlineTV roadmap from v39.9.0

## v39.9.0 — Downloads 2.0
Persistent download manager: queue, progress, retry/cancel, actionable errors, series/season batch downloads, storage usage and history. All state/actions are isolated per user.

## v39.10.0 — Continue Watching 2.0
Removal/clear UX, resume accuracy, next-episode flow, watched/restart actions and cross-device synchronization while preserving profile isolation.

## v39.11.0 — IPTV Manager 2.0
Provider management, group/channel activation filters, adult-group controls, reload/sync, new-channel policy and diagnostics.

## v39.12.0 — Live TV 2.0
Faster channel changes, favorites/recent channels, improved EPG, mini-guide, group navigation and playback resilience.

## v40.0.0 — MyOnlineTV Experience 2.0
A shared design system and interaction model across desktop, mobile, tablet and TV, with device-specific input behavior for mouse/keyboard, touch and D-pad/remote.

## Release principles
- Multi-user isolation is a release gate.
- Existing functionality must not regress when moving between roadmap releases.
- `RELEASE.cmd` is the canonical release entry point.
- GitHub Actions builds the immutable release artifacts.
