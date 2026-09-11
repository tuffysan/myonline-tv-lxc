## v30.1.0 — Account Source Isolation
- Made IPTV/Plex/Jellyfin account-scoped instead of globally shared.
- Added explicit per-source sharing to same-account users only.
- Added server-side cross-account access enforcement for source-specific routes.
- Filtered Unified Media and Live Now/Next by source visibility.
- Added Admin 2.0 Share controls on IPTV/Plex/Jellyfin source cards.

## v30.1.0 — Update Safety Hotfix
- Hardened final backend/nginx verification.
- Failed final verification now activates and verifies binary rollback.
- Suppressed harmless transient connection-refused retry noise.
- `Update verified` is emitted only after all final checks pass.

## v30.1.0 — Production Edition
- Added the Production Edition increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Full UX Polish
- Added the Full UX Polish increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Observability & Admin Diagnostics
- Added the Observability & Admin Diagnostics increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Performance & Media Index
- Added the Performance & Media Index increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Security Hardening
- Added the Security Hardening increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Installer, Updater & Rollback
- Added the Installer, Updater & Rollback increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Self-Healing Appliance
- Added the Self-Healing Appliance increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Notification Center
- Added the Notification Center increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Smart Home, EPG & Sports
- Added the Smart Home, EPG & Sports increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Mobile Companion & Remote
- Added the Mobile Companion & Remote increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Android TV & TV UX
- Added the Android TV & TV UX increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — DVR Production
- Added the DVR Production increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Unified Media Production
- Added the Unified Media Production increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Guide Production
- Added the Guide Production increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Live TV Production
- Added the Live TV Production increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Unified Playback Engine
- Added the Unified Playback Engine increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — UX Consistency & Navigation
- Added the UX Consistency & Navigation increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Error, Loading & Empty States
- Added the Error, Loading & Empty States increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Stabilization & Cleanup
- Added the Stabilization & Cleanup increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v30.1.0 — Admin 2.0
- Replaced the monolithic Admin page with a task-oriented six-section interface.
- Added actionable Overview, Needs Attention and Quick Actions.
- Redesigned Sources, Users & Profiles, Storage, Navigation and System administration.
- Added responsive/mobile Admin UX while preserving existing backend routes.

## v30.1.0 — Architecture & Code Quality
- Added Architecture & Code Quality implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Self-Healing Appliance
- Added Self-Healing Appliance implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Cinema & Screensaver
- Added Cinema & Screensaver implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Family & Guest
- Added Family & Guest implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Sports Hub
- Added Sports Hub implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Smart Collections
- Added Smart Collections implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Unified Watchlist
- Added Unified Watchlist implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — What's On Tonight
- Added What's On Tonight implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Smart EPG
- Added Smart EPG implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Notification Center
- Added Notification Center implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Stream Doctor
- Added Stream Doctor implementation increment.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Advanced TV Platform
- Provider-gated Catch-up/Start Over plus PiP/Multi-view/Sports platform.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Rooms & Handoff
- Local room playback ownership and handoff contract.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Phone Remote & Pairing
- Local expiring pairing and validated remote commands.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Android TV First-class
- D-pad, Media3 and HLS-readiness Android-TV contract.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Multi-device Platform
- Browser/mobile/tablet/TV/Android-TV device platform.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Universal Search
- One local search domain across TV, EPG, media and recordings.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Personal Home
- Personal local Home rail composition.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Profiles 2.0
- Profile, kids-mode and per-profile preference contract.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Playback Resilience
- Bounded playback fallback plan and useful error stages.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Playback Engine 2.0
- Central direct/HLS/remux/transcode decision policy.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Unified Library 4.0
- Deterministic dedupe and best-source policy.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Live TV 4.0
- TV-first zapping, Now/Next and previous-channel capabilities.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Server Media Index
- Local searchable media-index contract.
- Zero mandatory runtime cost preserved.

## v30.1.0 — Performance & Diagnostics
- Local performance measurements and diagnostics.
- Zero mandatory runtime cost preserved.

## v30.1.0
- New TV-first Live TV layout with compact channel rail and player/program panel.
- Hide-channel action moved to the right-side action group.
- Added current/next programme details and progress to Live TV.
- Added Home “On TV now” rail.
- Refined EPG styling and responsive TV/tablet layout.

# v30.1.0 — Feature Completion

- Build fix: FeatureCompletionCatalog moved to the global namespace so top-level Program.cs can resolve it.

- Added audited feature catalogue with FULLY IMPLEMENTED / PARTIAL / FOUNDATION / MISSING states.
- Added Admin → Feature Completion dashboard.
- Added `/api/admin/feature-completion`.
- Added `/api/platform/cost-policy`.
- Made zero mandatory runtime cost an explicit audited release property.
- Added roadmap for turning foundations into end-to-end features.
- No paid AI/cloud dependency introduced.

# Changelog

## v6.2.0 — Navigation hotfix
- Fixed Appliance menu click not dispatching `applianceView()`.
- Fixed Alerts menu click not dispatching `notificationsView()`.
- Fixed Rooms menu click not dispatching `roomsView()`.
- Fixed Library menu click not dispatching `unifiedLibraryView()`.
- Added regression validation for every menu view registered in the v2.0 navigation.


## v6.2.0 — DVR & Storage
- Exposed Live TV recording directly in Live TV and the player.
- Reworked Guide programme click into Play / Record actions.
- Added Admin → Storage.
- Added mounted-path/NAS destinations.
- Added rclone cloud destinations and target connectivity tests.
- Added default DVR and Download destinations.
- DVR now requires external/configured storage instead of permanent LXC storage.
- Download now offers This device or configured Storage destination.
- Added direct browser/device download endpoint.
- Added rclone installation to install/update dependencies.


## v1.0.0 — First stable milestone
- Promoted the cumulative v0.9.4 feature set to the first 1.0 milestone.
- Added release and device regression checklist.
- Added v1.0.0 upgrade notes.
- No deliberate feature expansion over v0.9.4; focus is release readiness and a stable baseline.


## v0.9.4 — Home redesign
- Rebuilt Home around source shortcuts and media rails.
- Added conditional Plex/Jellyfin Home shortcuts.
- Added poster-based favourites rail.
- Reordered Continue Watching, Recently Added and Recently Watched.
- Moved external streaming links into a collapsible section.


## v0.9.3 — Series UX
- Added episode watched-state store per profile.
- Added Play next unwatched.
- Added IPTV Watched/Unwatch controls.
- Added watched styling for IPTV and unified episodes.
- Added next-episode prompt after playback completion.


## v0.9.2 — Continue Watching
- Added duration-aware Continue Watching records.
- Added progress bars and elapsed/total time.
- Added Mark as watched.
- Suppressed zero/very-short resume entries.
- Auto-removes completed playback from Continue Watching.


## v0.9.1 — Stabilization
- Hardened remote-key detection.
- Fixed Mobile More-sheet close state and Escape handling.
- Added release smoke-test checklist.
- No new major feature surface; this release is deliberately regression-focused.


## v0.9.0 — Responsive & TV UX
- Added dedicated mobile, tablet, desktop and TV breakpoints.
- Added mobile bottom navigation and More sheet.
- Added tablet portrait bottom navigation and landscape compact sidebar.
- Added swipe-friendly media rails and denser mobile poster grids.
- Added sticky Guide channel column for mobile/tablet.
- Added 10-foot TV sizing, focus treatment and fullscreen player improvements.
- Added TV rail scrolling fallback when spatial navigation reaches an edge.
- Replaced random remote focus IDs with deterministic per-session IDs.


## v0.8.5 — Poster recovery
- Added IPTV catalogue-based poster backfill for Continue Watching and Recently Watched.
- Added legacy title normalization for `SC - ...` history entries.
- Added poster-only Continue Watching update endpoint that preserves Updated/order.
- Added Series-list poster fallback when series detail has no cover.
- Recovered posters are persisted to avoid repeated catalogue repair.


## v0.8.4 — Separate Plex and Jellyfin menus
- Added dynamic Plex navigation item when an enabled Plex connection exists.
- Added dynamic Jellyfin navigation item when an enabled Jellyfin connection exists.
- Added dedicated Plex Movies / Series view.
- Added dedicated Jellyfin Movies / Series view.
- Multiple same-type media servers are aggregated inside their own menu.
- IPTV Movies and Series remain separate.
- Media-library navigation refreshes after add/remove in Admin.


## v0.8.3 — Poster rails & modern scrollbars
- Added poster persistence to Continue Watching.
- Added poster artwork to Continue Watching and Recently Watched cards.
- Added IPTV episode fallback from episode poster to series cover.
- Added poster persistence for Plex/Jellyfin unified playback.
- Added best-effort artwork recovery for compatible legacy entries.
- Redesigned history cards for a TV/media-center layout.
- Added thin rounded custom horizontal scrollbars for Chromium/Edge/Safari and Firefox.


## v0.8.2 — Continue Watching & Recently Watched
- Fixed IPTV Movie Continue Watching by persisting provider and exact movie ID in the resume key.
- Fixed IPTV Episode Continue Watching by persisting provider, exact episode ID and extension.
- Added backward compatibility for v0.8.1 movie resume entries.
- Recently Watched movie cards now open the exact title.
- New episode history entries preserve exact playback metadata.
- Added individual and Clear all actions for Continue Watching.
- Added individual and Clear all actions for Recently Watched.


## v0.8.1 — Movie & Series duration
- Added server-side ffprobe duration detection for VOD/episode playback.
- Media session responses now include `durationSeconds`.
- Player now shows elapsed time and total runtime.
- Browser metadata duration remains a fallback when ffprobe cannot determine runtime.
- Live TV behavior remains unchanged.


## v0.8.0 — DVR & Live TV Recording
- Added persistent DVR recording queue.
- Added dedicated Recordings navigation and management view.
- Added manual recording scheduling by provider/channel/start/end.
- Added Shift+click recording from TV Guide programmes.
- Added FFmpeg stream-copy recording to MPEG-TS.
- Added cancel/remove/download endpoints and recording status tracking.
- Added scheduler recovery for missed windows.
- Kept v0.7.2 Media Center UX and Plex/Jellyfin features cumulative.


## v0.7.2 — Media Center UX
- Added Recently Added media-library rail on Home.
- Added All / Live / Movies / Series filters to global Search.
- Plex/Jellyfin search results now open/play the unified item directly.
- Fixed unified Plex/Jellyfin playback to use `playServerMedia`.
- Added resume-from-position for unified Continue Watching.
- Added next-episode context and a Next episode action for unified series.
- Added TV/remote focus polish for horizontal rails and episode cards.
- Kept v0.7.1 Plex/Jellyfin library selection and security improvements.


## v0.7.1 — Plex/Jellyfin completion & stability
- Added persistent Plex/Jellyfin library selection in Admin.
- Preserves selected libraries when editing a media-library connection.
- Jellyfin catalogue queries now respect selected libraries, matching Plex behavior.
- Routes Plex/Jellyfin artwork through MyOnline TV proxy tokens so media-server credentials are not exposed in browser image URLs.
- Added unified series episode discovery for Plex and Jellyfin.
- Unified series now opens an episode list rather than trying to play the series container.
- Added stable unified Continue Watching identifiers and resume handling.
- Keeps the v0.7.0 Live TV, Guide, IPTV Movies and IPTV Series baseline unchanged.


## v0.7.0 — Unified Media Center
- Promotes IPTV + Plex + Jellyfin integration to the v0.7.0 unified media-center milestone.
- Includes media-library administration, unified catalogues, playback, Search and Home discovery.
- Includes all prior authentication, provider editing, profile permissions, TV remote UX, caching and recovery functionality.
- Keeps the generic PUBLISH.cmd / PUBLISH.ps1 release workflow.

## v0.7.0 — Unified Search & Home
- Extends global Search to Plex and Jellyfin media-library content.
- Adds Plex/Jellyfin discovery rails to Home.
- Search continues to include Live TV, IPTV Movies and IPTV Series.
- Source badges identify where each media item comes from.
- Profile permissions continue to control which media areas are visible.

## v0.7.0 — Unified Playback & Continue Watching
- Adds Plex and Jellyfin playback token generation through the existing MyOnline TV media proxy.
- Plex resolves the media part before proxy playback; Jellyfin uses its authenticated stream endpoint.
- Unified Movies/Series items can launch in the existing browser player.
- Keeps the existing HLS/remux/transcode recovery path available through the media player foundation.
- Preserves existing IPTV Continue Watching and prepares unified items for shared progress handling.

## v0.7.0 — Unified Movies & Series
- Adds unified Movies and Series catalogue endpoints for enabled Plex and Jellyfin connections.
- Merges external media-library items into the existing Movies and Series views.
- Adds source badges so Plex, Jellyfin and IPTV content can be distinguished.
- Keeps the existing IPTV catalogue and playback behavior as the primary baseline.

## v0.7.0 — Media Libraries
- Adds Plex and Jellyfin as configurable media-library providers.
- Admin can add, edit, enable/disable, test and remove media-library connections.
- Plex token and Jellyfin API key are encrypted at rest and never returned to the browser.
- Adds library discovery endpoints for Plex sections and Jellyfin virtual folders.
- Prepares selected library IDs for unified Movies and Series in the next release.
- Keeps IPTV and all existing playback routes unchanged.

## v0.7.0 — Stable Feature Release
- Promotes the v0.5.x feature train to the v0.7.0 stable feature baseline.
- Includes working Live TV, Guide, Movies and Series playback foundations.
- Includes persistent catalogue cache, retry/recovery diagnostics and TV/Remote UX.
- Includes multi-user Admin, provider editing, web-app branding and profile permissions.
- Includes Search & Discovery across Live, Movies and Series.
- Adds a defensive startup fallback if profile-access configuration is temporarily unavailable.
- Keeps PUBLISH.cmd / PUBLISH.ps1 version-independent for all future releases.

## v0.7.0 — Search & Discovery
- Adds a dedicated Search view in the main navigation.
- Home search now opens global search instead of only filtering Movies.
- Searches the selected provider across Live channels, Movies and Series in parallel.
- Search respects current profile permissions.
- Results are grouped by Live TV, Movies and Series with poster artwork where available.
- Uses the existing catalogue caches and long Movies timeout to avoid changing working playback behavior.
- Keeps the permanent version-independent PUBLISH.cmd / PUBLISH.ps1.

## v0.7.0 — Profiles, Permissions & Parental Controls
- Adds per-user profile access and a default profile.
- Adds per-profile permissions for Live/Guide, Movies, Series and Downloads.
- Adds optional provider restrictions per profile.
- Adds server-side stored Kids PIN verification using the existing password hashing mechanism.
- Admin includes a permissions matrix and user-to-profile assignment controls.
- Normal users only see profiles and navigation items they are allowed to use.
- Keeps the permanent version-independent PUBLISH.cmd / PUBLISH.ps1.

## v0.7.0 — Admin & Provider Management
- Adds multi-user authentication with `Admin` and `User` roles.
- Automatically migrates the original single administrator account into `users.json`.
- Admin can create, edit, enable/disable, reset passwords and remove users.
- Protects the last enabled administrator and prevents deleting the currently signed-in account.
- Adds role claims to the authentication cookie and hides Admin/System navigation for normal users.
- Adds a dedicated Admin view for Users, Providers and Viewer Profiles.
- Adds Provider **Edit** with safe prefill of URL/username fields.
- Existing provider passwords are never returned to the browser; leaving password blank keeps the stored password.
- Provider changes still clear relevant runtime/catalogue caches.
- Adds MyOnline TV favicon, in-page brand icon and web-app manifest.
- Keeps permanent version-independent `PUBLISH.cmd` / `PUBLISH.ps1`.
- Keeps v0.5.6 TV/Remote UX, v0.5.5 recovery and all working playback/catalogue fixes.

## v0.7.0 — TV & Remote UX
- Replaces linear Up/Down focus stepping with spatial four-direction navigation.
- Arrow keys now choose the closest control in the intended direction.
- Stronger focus treatment for 10-foot/TV use, including poster-card scaling.
- Remembers the last focused control per view during the current app session.
- Remote/keyboard navigation automatically focuses useful content after changing views.
- Enter/OK activates the focused control.
- Backspace/Escape returns to Home when not in fullscreen and closes the profile picker first.
- Media Play/Pause keys are supported.
- Movies/Series support Media Rewind/Fast Forward and J/L for ±10 second seeking.
- F toggles fullscreen; active Live playback semantics remain unchanged.
- Adds a short on-screen remote-help hint after remote-style keyboard use.
- Keeps the permanent version-independent `PUBLISH.cmd` / `PUBLISH.ps1`.
- Keeps v0.5.5 Reliability & Recovery and all v0.5.3/v0.5.4 playback/catalogue fixes.

## v0.7.0 — Reliability & Recovery
- Adds three-attempt GET retry with progressive backoff for transient network, 429, 502, 503 and 504 failures.
- Timeout errors now include the endpoint and timeout duration.
- System page now shows catalogue cache file count/size, latest successful catalogue refreshes and recent tracked provider/catalogue errors.
- Adds **Run recovery** on the System page.
- Recovery removes exited Live/FFmpeg sessions and abandoned HLS directories older than 12 hours without interrupting active streams.
- Keeps the v0.5.4 persistent catalogue cache and v0.5.3 Movies/Series fixes.
- Introduces permanent `PUBLISH.cmd` and `PUBLISH.ps1`; they read `VERSION` automatically and are reused for every future release.
- Removes version-specific publish scripts.
- Live TV, Guide, Movies playback and Series playback routes remain unchanged.

## v0.7.0 — Stability & Cache Foundation
- Adds persistent on-disk Movies/Series catalogue cache under the application data directory.
- Uses stale cached catalogue data immediately while refreshing in the background.
- Adds Refresh buttons for Movies and Series.
- Shows loaded item counts in the UI.
- Clears catalogue cache when provider settings change.
- Adds explicit `/api/catalogue-cache/clear/{providerId}` endpoint.
- Keeps the working v0.5.3 Movies timeout/artwork fixes.
- Replaces the publish helper with a robust version that checks whether a remote tag exists before deleting it.
- Live TV, Guide, Movies playback and Series playback remain unchanged.

## v0.7.0 — Movies + Series artwork regression fix
- Movies frontend timeout now matches the slower VOD backend request path.
- Movies shows an explicit empty-state instead of a blank page.
- VOD catalogue loading is logged with elapsed time.
- Series and Movies artwork use provider image URLs directly again, avoiding the broken short-lived artwork proxy-token path.
- Frontend catalogue cache key bumped to avoid stale cached payloads.
- Includes `PUBLISH-v0.7.0.ps1` and `.cmd` to add, commit, push `main`, recreate/push tag `v0.7.0`, and trigger the GitHub release workflow.
- Live TV, Guide and media playback code paths are otherwise unchanged.

## v0.7.0 — Movies catalogue timeout fix
- Increases the Xtream `get_vod_streams` request timeout from 20 seconds to 120 seconds.
- Keeps the existing VOD catalogue cache behavior, so slower providers mainly affect the first catalogue load.
- Adds clearer Movies loading/error text for large or slow Xtream libraries.
- Live TV and Series code paths are intentionally unchanged from v0.5.1.

## v0.7.0 — updater extraction fix
- Splits the Proxmox release upload, gzip verification, extraction, application verification, and cleanup into separate `pct exec` commands.
- Keeps `/tmp/myonline-tv-release.tar.gz` until the extracted application has been verified.
- Verifies `MyOnlineTV.Web.dll`, runtime config, `wwwroot/index.html`, and `wwwroot/app.js` before deleting the uploaded archive.
- Adds step-specific error reporting for the release-artifact stage.
- Adds staging diagnostics on failure: uploaded artifact, extracted directory listing, and disk-space status.
- Application functionality from v0.5.0 is unchanged; this release only hardens the updater.

## v0.7.0 — Stable 0.7.0
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Stable 0.7.0.

## v0.7.0 — Release candidate / feature freeze
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Release candidate / feature freeze.

## v0.7.0 — Release hardening
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Release hardening.

## v0.7.0 — Regression checks
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Regression checks.

## v0.7.0 — Upgrade safety
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Upgrade safety.

## v0.7.0 — Error recovery
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Error recovery.

## v0.7.0 — Accessibility/keyboard polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Accessibility/keyboard polish.

## v0.7.0 — Mobile/tablet polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Mobile/tablet polish.

## v0.7.0 — Backup/restore polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Backup/restore polish.

## v0.7.0 — System page polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: System page polish.

## v0.7.0 — Downloads polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Downloads polish.

## v0.7.0 — Player UX polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Player UX polish.

## v0.7.0 — Player reliability polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Player reliability polish.

## v0.7.0 — Search debounce/performance
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Search debounce/performance.

## v0.7.0 — Artwork/browser cache hints
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Artwork/browser cache hints.

## v0.7.0 — Provider management polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Provider management polish.

## v0.7.0 — Profile-scoped history
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Profile-scoped history.

## v0.7.0 — Profile-scoped favourites
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Profile-scoped favourites.

## v0.7.0 — Profiles polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Profiles polish.

## v0.7.0 — Guide polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Guide polish.

## v0.7.0 — TV layout polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: TV layout polish.

## v0.7.0 — Remote playback controls
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Remote playback controls.

## v0.7.0 — TV/remote focus navigation
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: TV/remote focus navigation.

## v0.7.0 — Quick search
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Quick search.

## v0.7.0 — Home favourites/history rails
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Home favourites/history rails.

## v0.7.0 — Continue Watching polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Continue Watching polish.

## v0.7.0 — Local watch history
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Local watch history.

## v0.7.0 — Series favourites
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Series favourites.

## v0.7.0 — Movie favourites
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Movie favourites.

## v0.7.0 — Live favourites quick filter
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Live favourites quick filter.

## v0.7.0 — Player/session cleanup hardening
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Player/session cleanup hardening.

## v0.7.0 — Movies/Series catalogue cache
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Movies/Series catalogue cache.

## v0.7.0 — GET retry/timeout handling
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: GET retry/timeout handling.

## v0.7.0 — Diagnostics polish
- Incremental release in the v0.4.16 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Diagnostics polish.

## v0.7.0 — Release smoke test
- Incremental release in the v0.7.0 → v0.7.0 test train.
- Preserves all fixes and features from the previous release.
- Focus: Release smoke test.

## v0.7.0 — updater download fix
- Fixes the updater bug that reported a release asset as missing immediately after a successful download.
- Replaces the incorrect `if ! curl ... || { ... }` construct with a normal `if ! curl; then ... fi`.
- Verifies the downloaded application archive and checksum file with `test -s` semantics.
- Verifies that `SHA256SUMS-RELEASE.txt` actually contains the expected application artifact before running `sha256sum -c`.
- Moves the `github-common.sh` shebang back to the first line.
- Keeps the stable v0.4.14 application and corrected linux-x64 GitHub release workflow unchanged.

## v0.7.0 — Stable release workflow fix
- Keeps the user-confirmed v0.4.6 application baseline used by v0.4.13.
- Fixes GitHub Actions NETSDK1047 during Publish linux-x64.
- Adds an explicit runtime-specific `dotnet restore app/MyOnlineTV.Web.csproj -r linux-x64` before publish.
- Keeps `dotnet publish -r linux-x64 --self-contained false --no-restore` after the matching restore.
- Keeps release asset verification and GitHub Release publishing.

## v0.7.0 — Stable recovery build
- Restores the last user-confirmed working application baseline from v0.4.6.
- Live TV playback retained from the proven FFmpeg/HLS implementation.
- Movies playback retained from the proven v0.4.5/v0.4.6 implementation.
- Series playback retained from the proven v0.4.5/v0.4.6 implementation.
- Guide retains one-click direct playback from v0.4.6.
- Excludes the later v0.4.7+ catalogue pagination/history/cleanup changes that introduced regressions or build failures.
- Uses the corrected GitHub Release workflow and updater infrastructure from the later release-fix work.
- Intended as the new stable baseline before adding further features.

## v0.7.0
- Guide programmes now start Live TV immediately when clicked.
- Removed the old flow that scrolled to a programme details card at the bottom of the Guide and required a second Watch Live click.
- Playback uses the existing Guide player area above the timeline.
- Channel-row Live buttons continue to work unchanged.
- Keeps all v0.4.5 Movies/Series FFmpeg-HLS playback fixes and v0.4.4 release fixes.

## v0.7.0
- Fixes Movies and Series playback in browsers.
- Identified raw MKV/TS/provider media as the playback problem: browsers cannot reliably play these containers/codecs through a simple HTTP proxy.
- Movies and episodes now start server-side FFmpeg HLS playback, like the proven Live TV pipeline.
- Playback first attempts stream-copy/remux for low CPU use.
- If hls.js reports an incompatible codec, the player automatically retries with H.264/AAC transcoding.
- Provider media URLs remain server-side and are resolved through short-lived media tokens.
- Download handling remains separate and unchanged.
- Keeps v0.4.4 release/tag compatibility and all Live TV/catalogue fixes.

## v0.7.0
- Includes the v0.4.3 Movies/Series lazy-token and catalogue scalability fixes.
- Fixes GitHub Release packaging so artifact filenames are no longer hard-coded to one version.
- Release workflow accepts preferred `v0.7.0` tags and legacy-compatible `v.0.7.0` tags.
- Updater normalizes both tag formats to the canonical artifact name `myonline-tv-web-v0.7.0-linux-x64.tar.gz`.
- Updater now gives a clear error when a GitHub Release exists without built artifacts.
- README documents how to verify a successful release before updating Proxmox.

## v0.7.0
- Fixes the Movies/Series catalogue scalability regression identified from v0.4.2 runtime logs.
- Catalogue endpoints no longer create thousands of proxy/download tokens while loading every movie/episode.
- Movie playback/download tokens are now created lazily only when Play/Download is clicked.
- Series episode playback/download tokens are now created lazily only when an episode is clicked.
- Keeps Xtream catalogue caching and the v0.4.1 Live TV fix.
- Reduces memory/CPU pressure caused by very large IPTV VOD catalogues.

## v0.7.0
- Movies/Series reliability hotfix.
- Added 10-minute Xtream catalogue caches for VOD and Series categories/items.
- Bounded catalogue requests so a slow provider does not leave the UI loading indefinitely.
- Improved invalid/empty Xtream response diagnostics and returns 502 with sanitized provider errors.
- Movies and Series now show load failures inside their grids instead of appearing stuck.
- Preserves the v0.4.1 Live TV regression fix.

## v0.7.0
- Critical Live TV regression fix.
- Removed an accidental Continue Watching block from `playLive()` that referenced undefined `mediaId`, `video` and `url` variables and stopped Live TV before `/api/live/start` was called.
- Moved Continue Watching tracking into `playMedia()` where those variables belong.
- Keeps the v0.3.16 working FFmpeg/HLS Live TV start/status/playback flow.
- Keeps v0.4.0 Guide, channel/group visibility, profiles and system features.

## v0.7.0
- Viewer profiles with profile picker and Settings management.
- System dashboard shows active streams, profiles and app memory.
- Backup now includes channel preferences and profiles.
- Restore provider/channel/profile/viewing data from a server backup.
- Includes all Guide, channel management and Movies/Series improvements from v0.3.18–v0.3.20.

## v0.7.0
- Poster-first Movies and Series presentation.
- Movie details with plot, genre, year and rating when provided by Xtream.
- Richer Series cards.
- Continue Watching progress is saved during movie/episode playback.
- Home page now has a Continue Watching rail.

## v0.7.0
- Guide windows for Now, Tonight and Tomorrow.
- Red current-time line and current-program highlighting.
- Programme details with Watch live action.
- Live player stays available above the guide while browsing EPG.

## v0.7.0
- Start Live TV directly from channel rows and programme blocks in Guide.
- Hide whole groups or individual channels.
- Server-side channel/group preferences shared across devices.
- Local channel aliases.
- Settings page for managing and restoring hidden groups/channels.

## v0.7.0
- Live TV UX release.
- Added Now/Next EPG information to channel cards and player overlay.
- Added LIVE overlay with channel logo and clock.
- Added Favourites and Recently watched channel groups.
- Added previous/next channel controls.
- Added fullscreen control.
- Added keyboard/remote navigation: arrows, Enter and F.
- Added clearer Connecting / Preparing / Playing / Error playback states.
- Kept the working v0.3.16 FFmpeg/HLS playback architecture unchanged.

## v0.7.0
- Release re-spin of v0.3.15 so a clean GitHub Release can be created.
- Same Live TV direct provider/channel playback flow as v0.3.15.
- Version and release metadata updated to 0.7.0.

## v0.7.0
- Fixed Live TV playback start by removing the temporary in-memory live proxy token hop.
- `/api/live/start/{providerId}/{channelKey}` now resolves the channel directly from the server-side provider cache and starts FFmpeg from its protected source URL.
- Fixed TV Guide playback to pass the channel key instead of the removed `playToken` field.
- Keeps provider credentials and source stream URLs server-side.
- Preserves asynchronous FFmpeg/HLS startup and compatibility-transcoding fallback from v0.3.14.

## v0.7.0

- Fixed Live TV channel-list requests timing out at the internal Nginx reverse proxy.
- Added a 10-minute per-provider channel cache; stale channel data is served immediately while refresh runs in the background.
- Removed eager per-channel media/live proxy-token creation, which could create tens of thousands of tokens and drive high CPU usage.
- Channel artwork and Live TV tokens are now resolved lazily only when the browser requests an image or starts a channel.
- Xtream `get_live_streams` is bounded to 12 seconds and category lookup to 3 seconds; the slow M3U fallback is no longer chained into the same Xtream channel-list HTTP request.
- M3U channel loading has a bounded 15-second timeout and safe stable channel keys.
- Live TV FFmpeg startup is now asynchronous: `/api/live/start` returns immediately and the UI polls `/api/live/status/{sessionId}` until HLS is ready or fails.
- Improved browser error text so an Nginx HTML 504 page is not dumped raw into the UI.
- Provider edits/deletes invalidate the corresponding channel cache.

## v0.3.13

- Added server-side Live TV playback for browsers: MPEG-TS/RAW provider streams are remuxed by FFmpeg to HLS.
- Added authenticated Live TV start, HLS segment and session-stop endpoints.
- Live TV and Guide use the server HLS pipeline instead of sending `video/mp2t` directly to HTML5 video.
- Channel changes stop the previous FFmpeg process and clean temporary HLS segments.
- Uses stream-copy remuxing first for low CPU usage.
- If hls.js reports a fatal playback/codec error, the UI retries once using H.264/AAC compatibility transcoding.
- Added sanitized playback diagnostics.
- No DRM/encryption bypass is implemented.

## v0.3.12

- Live TV for Xtream providers now prefers `player_api.php?action=get_live_streams` instead of downloading the full M3U playlist.
- Adds Xtream live-category lookup and builds proxied live stream URLs from stream IDs.
- Falls back to the Xtream M3U endpoint if the live API fails.
- Converts upstream provider failures into a clear HTTP 502 response instead of a generic application 500.
- Adds safe provider diagnostics without returning stored credentials to the browser.
- Adds **Test** for each provider in Settings, reporting auth/live or playlist status, content type and latency.
- Adds provider request User-Agent and bounded request timeouts.
- Redacts username/password values from provider error messages written to the UI/log diagnostic path.

## 0.3.12 — Reverse-proxy host fix, dynamic UI version and updater diagnostics

- Fixed provider POST requests returning `403 Cross-origin state-changing requests are not allowed` behind Nginx Proxy Manager.
- Internal Nginx now preserves the upstream `X-Forwarded-Host` and uses it for both `Host` and `X-Forwarded-Host` when proxying to Kestrel.
- Moved all `proxy_set_header` directives into `location /` so Nginx header inheritance cannot discard Host/forwarded headers when WebSocket headers are present.
- Direct LAN HTTP requests still fall back to the locally received host and scheme.
- Sidebar version is now populated dynamically from `/api/status`; removed the stale hard-coded `Web v0.3.6` label.
- Update script now reports the exact failed step, line, command and exit code instead of terminating silently under `set -e`.
- Expanded update step 3 with staging/upload/extraction verification and corrected all progress counters to `[1/8]` through `[8/8]`.
- Reverse-proxy migration verification now requires `$my_forwarded_host` for `Host` and `X-Forwarded-Host`.

## 0.3.10 — Same-origin normalization, loopback binding and upgrade execution fix

- Reworked same-origin protection for authenticated state-changing API requests.
- Origin validation now compares normalized URI scheme, host, and effective port instead of raw origin strings.
- Default `https:443` and `http:80` ports no longer cause false cross-origin rejections.
- Rejected same-origin requests now log safe diagnostic fields: origin/request scheme, host, port, and forwarded host/protocol.
- Kestrel now binds to `127.0.0.1:5080` instead of `0.0.0.0:5080`.
- Fresh installations now write `/var/lib/myonlinetv/version` and `release.json`.
- Fixed `update-from-github.sh` using `exec`, which made all following migration code unreachable.
- System configuration migrations now live in `scripts/update-local.sh`, where they run for both release and local/source update paths.
- Update verification reapplies Nginx configuration, hostname, restarts services, and validates both port 5080 and port 80.
- Keeps all fixes from v0.3.9 and earlier releases.

## 0.3.9 — Installer helper loading and hostname variable fix

- Fixed fresh-install failure at `[8/9] Configuring Nginx...` with `write_nginx_config: command not found`.
- `scripts/install-local.sh` now explicitly resolves the repository root and sources `scripts/github-common.sh` before calling shared migration/helper functions.
- Fixed the container hostname default being inherited from the Proxmox host through the standard shell `HOSTNAME` environment variable.
- Installer now uses a dedicated `CT_HOSTNAME` variable with default `MyOnlineTV`.
- New installations therefore create the LXC with hostname `MyOnlineTV` instead of accidentally inheriting `proxmox`.
- Existing v0.3.8 reverse-proxy migration, forwarded-header handling, health checks, and upgrade migration logic are retained.

## 0.3.8 — Upgrade migrations, reverse-proxy fix and hostname

- Fixed upgrades that installed the v0.3.7 application binary but left the old v0.3.6 Nginx configuration in place.
- Upgrade now reapplies the current MyOnline TV Nginx configuration and validates it before reporting success.
- Added reusable system-configuration migration helpers for Nginx and container hostname.
- Internal Nginx now preserves an upstream `X-Forwarded-Proto` value and falls back to its own scheme for direct LAN access.
- `X-Forwarded-Host` is forwarded to ASP.NET Core.
- Upgrade verifies both backend health on `127.0.0.1:5080` and public Nginx health on port 80.
- Container hostname is now `MyOnlineTV` instead of `proxmox` for both new installations and upgrades of existing containers.
- `/etc/hostname` and the local `127.0.1.1` host mapping are synchronized with the Proxmox LXC hostname.
- Keeps all fixes from v0.3.7 and earlier releases.

## 0.3.7 — HTTPS reverse-proxy / forwarded-header fix

- Fixed `Cross-origin state-changing requests are not allowed` when MyOnline TV is published through an HTTPS reverse proxy such as Nginx Proxy Manager.
- ASP.NET Core now processes `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` before authentication and same-origin checks.
- Forwarded headers are trusted only from the local loopback proxy (the Nginx instance in the MyOnline TV LXC).
- The internal Nginx now preserves the upstream `X-Forwarded-Proto` value so an external HTTPS request remains `https` from the application's point of view.
- The internal Nginx also forwards `X-Forwarded-Host`.
- Kestrel now binds only to `127.0.0.1:5080` instead of `0.0.0.0:5080`, so the ASP.NET port is no longer directly exposed on the LAN.
- Added an installer check that exercises forwarded HTTPS headers through the local Nginx path.
- Keeps the v0.3.6 data-permission and health-flow fixes and all earlier installer/release fixes.

## 0.3.6 — Data permissions and health-check flow fix

- Fixed backend startup failures caused by `/var/lib/myonlinetv` being owned by `root:root` while `myonlinetv.service` runs as `www-data`.
- Installer now prepares `/var/lib/myonlinetv`, `downloads`, and `backups` before service startup.
- Persistent data ownership is set recursively to `www-data:www-data`.
- Data directories are set to mode `700`.
- Removed premature direct port-5080 curl checks that could abort before diagnostic output.
- Service startup failures now print `systemctl status` and recent `journalctl` output immediately.
- Final checks still verify the ASP.NET backend on port 5080 and Nginx on port 80.
- Keeps fixes from v0.3.5, v0.3.4, v0.3.3 and v0.3.2.

## 0.3.5 — Service startup regression fix

- Fixed v0.3.4 installer regression where `myonlinetv.service` was created but not started before health checks.
- Installer now explicitly runs:
  - `systemctl daemon-reload`
  - `systemctl enable myonlinetv`
  - `systemctl restart myonlinetv`
  - `systemctl is-active --quiet myonlinetv`
- MyOnline TV service startup is now a dedicated installer step before locale and Nginx configuration.
- Backend health-check failures now print:
  - `systemctl status myonlinetv`
  - recent `journalctl -u myonlinetv`
  - listening sockets from `ss -lntp`
- Keeps the v0.3.4 Nginx activation/end-to-end checks, v0.3.3 artifact-path fix, and v0.3.2 architecture-safe template selection.

## 0.3.4 — Nginx activation and end-to-end install verification

- Fixed successful installs that still showed the default "Welcome to nginx!" page.
- Installer now removes `/etc/nginx/sites-enabled/default` explicitly.
- Installer now force-updates the `myonlinetv` site symlink with `ln -sfn`.
- Nginx configuration is validated with `nginx -t` before activation.
- Nginx is explicitly restarted after the MyOnline TV site is enabled.
- Installer verifies that Nginx is active after restart.
- Final installation checks now validate both:
  - backend `/health` and `/ready` on port 5080;
  - public reverse-proxy `/health` and `/ready` through Nginx on port 80.
- Installer fails if the Nginx default welcome page is still being served.
- Added locale setup for `en_US.UTF-8` to remove Perl locale warnings.
- Keeps the v0.3.3 release artifact path fix and v0.3.2 architecture-safe Debian template selection.

## 0.3.3 — Release artifact path fix

- Fixed stable install/update failure after SHA-256 verification.
- `download_release_artifact()` now sends `sha256sum -c` status output to stderr.
- Command substitution now captures only the downloaded artifact path.
- Prevents `ARTIFACT` from containing both `filename: OK` and the actual path.
- Ensures `pct push` receives a valid local file path and copies the release archive into the LXC.
- Keeps the v0.3.2 architecture-safe Debian template selection.

## 0.3.2 — Proxmox architecture selection fix

- Fixed LXC startup failure caused by selecting an ARM64 Debian template on an x86_64 Proxmox host.
- Installer now detects host architecture with `uname -m`.
- `x86_64` maps explicitly to `amd64`.
- `aarch64`/`arm64` maps explicitly to `arm64`.
- Debian template selection now filters by both Debian version and CPU architecture.
- Installer refuses mismatched templates before container creation.
- Added post-create architecture verification using `pct config`.
- If the created CT architecture does not match the expected architecture, the invalid CT is destroyed automatically.
- Added clearer installer output showing host architecture, template architecture, and selected template.
- Keeps all v0.3.1 GitHub Release fixes and v0.3.0 appliance functionality.

## 0.3.1 — GitHub Release workflow fix

- Fixed GitHub Release packaging failure: `tar: .: file changed as we read it`.
- Release archives are now created in `/tmp`, outside the repository tree being archived.
- Release workflow now reliably produces:
  - `myonline-tv-web-v0.3.1-linux-x64.tar.gz`
  - `myonline-tv-lxc-v0.3.1-source.tar.gz`
  - `SHA256SUMS-RELEASE.txt`
  - `release.json`
- Added an explicit artifact-existence verification step before release upload.
- Keeps all v0.3.0 appliance functionality unchanged.

## 0.3.0 — Appliance release

- Stable GitHub installs now use a prebuilt `linux-x64` release artifact.
- LXC stable installs need ASP.NET Core Runtime 10 rather than the full .NET SDK.
- SHA-256 verification of release artifacts.
- Added `release.json` with version, minimum-upgrade and data-schema metadata.
- Added `/health` liveness endpoint.
- Added `/ready` readiness endpoint with data-directory, secret-key and FFmpeg checks.
- Updater creates a persistent-data backup before every upgrade.
- Updater keeps binary rollback and automatically restores binaries after a failed health/readiness check.
- Manual rollback can optionally restore the pre-update data snapshot with `RESTORE_DATA=1`.
- Added System/Admin page with runtime, disk, provider health and backup status.
- Added provider connectivity/latency tests.
- Added in-app configuration backup creation.
- GitHub Releases now publish both prebuilt runtime artifact and source artifact.
- Retains v0.2.0 authentication, encrypted provider storage, IPTV, EPG, VOD, Series, HLS proxy and downloads.

## 0.2.0
- GitHub-ready Proxmox LXC release.

## v6.2.0 — Compile hotfix
- Added missing `profileStateFile` path declaration for server-side profile sync.
- Retained the v2.2.1 diagnostics compile fix (`LoadMediaLibraries()`).
- Retained the v2.0.1 menu-dispatch fixes.

## v6.2.0 — Navigation cleanup
- Removed Platform, Profile Sync, Diagnostics and Appliance from the viewer navigation.
- Platform is now exposed to administrators as **System overview** under Admin.
- Diagnostics and Appliance are now Admin system tools.
- Profile Sync remains background functionality and no longer has a user-facing menu item.
- Existing APIs and views are retained; this is a navigation/UX cleanup, not feature removal.

## v6.2.0 — Navigation Manager
- Admin can show/hide and reorder menu pages, persisted server-side.
- Home and Admin are protected.
- System overview, Diagnostics and Appliance are configurable.
- Profile Sync remains background-only.

## v6.2.0 — User Source Access
- Admin controls per user whether IPTV, Plex and Jellyfin use Admin configuration or user-managed credentials.
- Added My Sources for self-managed connections.
- Personal secrets are encrypted server-side.

## v6.2.0 — Source & Access Architecture
- Added a common effective-source API for IPTV, Plex and Jellyfin.
- Source resolution now exposes whether each source comes from Admin or the signed-in account.
- Added capability discovery for Live TV, Guide, Movies, Series, Search and DVR.
- Retains encrypted personal credentials and per-user source policy from v3.0.4.
- This release establishes the contract used by later playback/library releases.

## v6.2.0 — Player 3.0
- Added per-account player preferences persisted server-side.
- Added player capability endpoint.
- Added keyboard/remote-friendly playback shortcuts: play/pause, ±10 seconds, mute and fullscreen.
- Keeps existing HLS/FFmpeg playback and resume infrastructure.
- Provides the foundation for automatic Direct Play/FFmpeg fallback decisions.

## v6.2.0 — DVR 3.0
- Added persisted DVR engine settings and concurrency/conflict policy.
- Added upcoming-recordings endpoint for TV/Guide clients.
- Existing series rules, NewOnly, padding, retention and storage-target support remain cumulative.
- Admin can control DVR engine policy without changing user recordings.
- Designed for subsequent EPG-driven scheduling and conflict resolution.

## v6.2.0 — EPG & Live TV 3.0
- Added per-account EPG preferences: guide depth, compact mode, favourites-first and Now/Next.
- Added lightweight Now/Next channel endpoint for mini-guide clients.
- DVR actions remain available from Guide and can use the v3.3 engine policy.
- Prepared the Live UI for a faster mini-guide and favourite-channel workflow.

## v6.2.0 — Unified Library 3.0
- Added account-level unified-library preferences.
- Supports automatic source choice, duplicate merging policy, sorting and unavailable-item filtering.
- Added source-origin metadata endpoint for IPTV/Plex/Jellyfin.
- Builds on the existing unified Movies/Series and source-choice UI rather than creating another media silo.

## v6.2.0 — Profiles & Household 3.0
- Added household sync preferences for watch state, favourites, Continue Watching and room handoff.
- Added sync-status endpoint for troubleshooting account/profile synchronisation.
- Existing PIN/profile access remains cumulative.
- Keeps source credentials account-level while media state remains profile-oriented.

## v6.2.0 — Admin 2.0
- Added a consolidated Admin overview API for users, IPTV providers, media libraries, storage, navigation and source policies.
- Navigation Manager and per-user Source Access remain inside Admin instead of user-facing technical menus.
- Designed around Users, Sources, Storage, Navigation, Backup and System as the primary administration domains.

## v6.2.0 — Backup, Restore & Migration
- Added a migration manifest that inventories persistent MyOnline TV configuration.
- Added backup-readiness validation for the data directory.
- Existing ZIP backup/restore remains cumulative and now has an explicit migration contract.
- Includes navigation, source policies, personal-source metadata, storage, DVR and preference files.

## v6.2.0 — TV & Mobile Polish
- Improved touch target sizing, TV-scale navigation and focus visibility.
- Added client-mode detection for mobile/desktop/TV layouts.
- Added focus recovery for coarse-pointer/TV-like devices.
- Updated the PWA service-worker cache generation to v6.2.0.
- Keeps the existing mobile bottom navigation and TV spatial-navigation foundation.

## v6.2.0 — Appliance
- Marks the first appliance-oriented 4.x baseline.
- Added appliance readiness and version/channel endpoints.
- Readiness verifies FFmpeg, FFprobe, persistent-data write access, authentication and media-source presence.
- Carries forward source architecture, Player 3.0, DVR policy, EPG preferences, unified library, household sync, Admin 2.0, migration tooling and TV/mobile polish.
- Generic PUBLISH.cmd / PUBLISH.ps1 remains the release mechanism.

## v6.2.0 — Compile Hotfix
- Fixed ProviderStored.Enabled compile errors by treating configured providers as available.
- Fixed AppUser.IsAdmin compile error by using Role == Admin and Enabled.
- Replaced nonexistent GetChannels() call with existing GetCachedChannels(provider) aggregation.
- Keeps all v4.0.0 functionality unchanged otherwise.

## v6.2.0 — Stability & Architecture
- Updater resolves latest stable through the GitHub Releases API first and falls back to the redirect method.
- Explicit MYONLINE_REF=vX.Y.Z upgrades remain supported.
- Keeps the v4.0.1 compile-hotfix baseline unchanged for media playback.
- Adds a safer release baseline before feature work continues.

## v6.2.0 — Sources 2.0
- Refreshes the effective IPTV/Plex/Jellyfin source mode on app entry.
- Unavailable source-backed UI can be disabled instead of failing silently.
- Personal-source credentials remain encrypted server-side.
- This release strengthens the source-policy UX while preserving stable playback routes.

## v6.2.0 — Unified Home
- Introduces a stable home-section contract for Continue Watching, Live, Next Up, Recently Added, Favourites and Library.
- Home sections can be reordered without changing provider data.
- Adds day-part state for contextual presentation.
- Keeps the Home experience source-agnostic.

## v6.2.0 — Player 4.0
- Adds bounded automatic recovery for transient player stalls.
- Attempts to preserve playback position through recovery.
- Adds fullscreen double-click while retaining existing keyboard/remote controls.
- Dynamically created video elements get the same recovery behaviour.

## v6.2.0 — Live TV & EPG 4.0
- Adds TV-style PageUp/PageDown channel navigation.
- Builds on the existing Now/Next and EPG preference APIs.
- Preserves Guide Play/Record actions and current Live playback paths.
- Improves keyboard and remote operation without adding another menu page.

## v6.2.0 — DVR 4.0
- Consolidates DVR engine policy, upcoming recordings and conflicts into one client state.
- Exposes conflict state for UI badges and warnings.
- Retains recording jobs, storage targets, series rules, padding and retention.
- No existing DVR JSON migration is required.

## v6.2.0 — Household
- Consolidates household preferences and profile-sync status into one client state.
- Keeps PIN/profile restrictions cumulative.
- Room handoff capability is exposed without restoring a Profile Sync menu page.
- Source credentials remain separate from per-profile media state.

## v6.2.0 — PWA 3.0
- Updates the service-worker cache generation to v6.2.0.
- Adds explicit online/offline UI state.
- Captures the install prompt for an in-app Install action where supported.
- API requests continue to bypass static shell caching.

## v6.2.0 — Appliance Manager
- Adds a consolidated appliance snapshot across health, readiness, platform and backup state.
- Designed for one Admin/System maintenance surface.
- Works with the v4.1 updater and cumulative backup/migration APIs.
- Preserves the Proxmox LXC deployment model.

## v6.2.0 — Unified Media Appliance
- Promotes the cumulative 4.x train to the v5 unified-media-appliance baseline.
- Consumer experience remains centred on Home, Live TV, Guide, Movies, Series, Library, DVR and Search.
- IPTV, Plex and Jellyfin remain source providers behind one application shell.
- Admin/System retains navigation, source policy, storage, diagnostics, backup/migration and readiness tooling.
- PWA/TV/mobile behaviour, DVR state, unified home and player recovery are cumulative.
- No DRM bypass or proxying of commercial streaming services is introduced.

## v6.2.0 — Stability & Performance
- Adds a lightweight browser runtime health snapshot and global failure counters.
- Preserves the v5.0.0 media paths while establishing a diagnostics baseline before deeper architecture changes.
- Retains the GitHub Releases API updater introduced in v4.1.0.
- Known historical C# compile regressions are checked during package validation.

## v6.2.0 — Source Engine 3.0
- Introduces a single client-side Source Engine facade over the effective-source API.
- IPTV, Plex and Jellyfin availability/mode can be queried consistently by Home, Library and playback UI.
- Admin-vs-personal source policy remains server-owned; credentials are not exposed to the browser.
- Existing playback endpoints remain compatible while the UI gains one source-resolution contract.

## v6.2.0 — Smart Player
- Adds a unified player-state layer for playing, paused, buffering and ended states.
- Automatically attaches to dynamically created video elements.
- Builds on Player 4.0 recovery, resume and keyboard/remote controls.
- Creates a stable client contract for future Direct Play/remux/transcode decisions.

## v6.2.0 — Live TV Experience
- Adds recent-channel history storage for fast return to previously watched channels.
- Adds numeric channel-entry events for TV remotes/keyboards.
- Retains PageUp/PageDown zapping and existing Guide/Now-Next integration.
- Provides the client hooks needed for a mini-guide overlay without changing stable Live playback.

## v6.2.0 — DVR Scheduler
- Promotes DVR engine/upcoming/conflict information into a reusable scheduler client facade.
- Surfaces conflict state globally and exposes the next scheduled recording.
- Existing series rules, NewOnly, padding, retention and storage-target behaviour remain cumulative.
- Does not migrate or discard existing recording data.

## v6.2.0 — Unified Library 4.0
- Adds deterministic title/year normalization and duplicate grouping helpers.
- Adds preferred-source selection with fallback to another available copy.
- Designed for Movies/Series supplied by IPTV, Plex and Jellyfin under one library surface.
- Does not alter provider credentials or raw media records.

## v6.2.0 — Recommendations
- Adds a local deterministic recommendation/ranking engine for Continue Watching, Next Episode, favourites and recently added content.
- Unavailable items are strongly deprioritized.
- No viewing history is sent to an external AI/recommendation service.
- The ranking helper can be reused by Home and Library without creating another menu page.

## v6.2.0 — Multi-room & Remote
- Adds a common remote-control command bus for play, pause, next, previous and volume.
- Current browser player responds to play/pause/volume commands.
- Builds on the existing Rooms/handoff foundation.
- Provides a protocol boundary for a future mobile remote or native TV client.

## v6.2.0 — Appliance Operations
- Consolidates health, readiness, backup readiness and platform status into an operations facade.
- Adds a support-summary exporter containing non-secret runtime/system state.
- Works with the cumulative updater, migration and backup APIs.
- Keeps technical operations behind Admin/System rather than the consumer navigation.

## v6.2.0 — Native Client Generation
- Defines v6 as a server + Web/PWA + native-client architecture.
- Adds a stable client bridge/capability contract in the Web client.
- Adds an Android TV client API/security contract and implementation roadmap.
- Provider credentials remain server-only; native clients consume MyOnline TV APIs.
- Web/PWA remains fully supported while native TV development can proceed independently.

## v6.2.0 — Android TV Client Foundation
- Added native Android TV / Google TV starter client, API session foundation, D-pad flow and native player foundation.

## v6.2.0 — Android TV Native UI
- Fixed native login to match the server JSON API.
- Added native Live, Guide, Movies, Series, episodes and server-backed playback flows.

## v6.3.0 — TV Experience
- Added TV UI state and recent-channel foundation.

## v6.4.0 — Profiles & Personalization
- Added native profile/favourites/Continue Watching state.

## v6.5.0 — Search & Discovery
- Added native discovery/ranking layer.

## v6.6.0 — DVR on TV
- Added native DVR/upcoming/conflict state contract.

## v6.7.0 — Device & Pairing
- Added persistent TV device identity foundation.

## v6.8.0 — Mobile Remote
- Added common remote-control command contract.

## v6.9.0 — Multi-room
- Added playback handoff model.

## v7.0.0 — MyOnline TV Platform
- Added API Contract v1 and client capability model.

## v8.0.1 — Updater cleanup hotfix
- Prevent temporary release-archive cleanup from aborting an otherwise verified upgrade.

## v9.0.1 — Kestrel loopback hotfix
- Fixed Kestrel bind address 129.0.0.1 -> 127.0.0.1 on port 5080.
- Added regression check for the expected local loopback binding.
