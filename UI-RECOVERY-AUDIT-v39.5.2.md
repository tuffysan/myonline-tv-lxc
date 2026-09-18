# v39.5.2 – Full UI Recovery Audit

This release continues the v39.5.1 recovery and removes remaining experimental
v39.x UI/runtime layers that conflict with established application screens.

## Screen-flow audit

- Login: app remains hidden until authenticated; no experimental setup wizard runs on DOMContentLoaded.
- Home: established authenticated `home()` remains authoritative; duplicate Simple Home bootstrap stays disabled.
- Live TV: existing player/remote implementation remains authoritative; duplicate v39.1 PageUp/PageDown listener and overlay removed.
- Guide: no new pre-auth guide bootstrap exists; Guide remains reachable only through the authenticated application shell.
- Movies: existing provider/category/search/detail flow retained.
- Series: existing provider/category/search/episode flow retained.
- Search: established `searchView()` retained; experimental v39.0 overlay, duplicate Ctrl+K handler and unsupported `/api/search/*` calls removed.
- My Stuff: existing Continue/Favorites/Watchlist/Recent view retained.
- Edit IPTV / My Sources: existing source-management UI retained.
- Settings/Admin: existing screens retained without global v39.x control resizing.

## Visual recovery

- Experimental v39.5 accessibility state is reset once on first v39.5.2 load so old
  `largeText`, `highContrast`, `reduceMotion` or `extraFocus` flags cannot keep the UI altered.
- Accessibility remains available as an opt-in capability after recovery.
- Global mobile body safe-area padding removed.
- Safe-area padding is scoped to adaptive action sheets.
- Global tap-target and TV focus overrides removed in v39.5.1 remain removed.

## Intent

No new product features. This is a stabilization/recovery release before any v39.6+ work.
