## v40.8.1 – Instant Seek Release Gate Fix
- Harden Continuous VOD regression tests to validate handover capabilities rather than exact comment text.
- No playback behavior rollback.

# v40.8.0 - Instant Seek

- Buffered seeks are immediate.
- Debounced/cancellable background seek for unbuffered positions.
- Current frame remains visible until atomic session handover.
- Timeline remains interactive while seeking.

# v40.7.0 - Playback Reliability

- Adds a central VOD playback reliability state machine.
- Adds a one-second progress watchdog with automatic recovery for unexpected stalls and pauses.
- Protects intentional user pause from automatic recovery.
- Adds playback diagnostics: state, buffer ahead, stalls, recoveries, underruns, seeks, time-to-first-frame, progress age, recovery reason and media errors.
- Keeps Smart VOD Buffering, Continuous VOD handover and the contained Unified Player from v40.6.3.
- Adds release-gate regression coverage for the reliability engine.

# v40.6.3 - Smart Buffer Release Gate Fix

- Keeps Smart VOD Buffering at 120 s target / 240 s maximum.
- Removes obsolete Streaming Engine regression assertions that required the historical 90/180 second buffer values.
- Streaming Engine regression coverage now checks buffer capability markers while Smart VOD tests own the current 120/240 policy.
- Preserves the v40.6.2 Continuous VOD server handover capability test.

# v40.6.2 - Release Gate & Handover Fix

- Fixes the Continuous VOD server-handover regression gate that incorrectly required a comment string that was not present in the implementation.
- The release gate now verifies the actual handover capability: replacement sessions are created independently, registered in `liveSessions`, and old sessions remain explicitly deletable after client handover.
- Keeps Smart VOD Buffering, continuous seek handover, contained player layout, and A/V sync behavior from v40.6.1 unchanged.
- Prevents future release failures caused by testing an explanatory comment instead of executable capability markers.

## v40.6.1
- Smart VOD buffering, prebuffered seek handover, buffer health UI and stronger stall recovery.

## v40.5.1 — Contained Player Layout Fix
- Restored bounded VOD player sizing on desktop while preserving fullscreen and unified controls.

## v40.4.2 — Release Gate Hardening
- Hardened VOD Seek, Streaming Engine and Playback Resilience release tests so they no longer require obsolete exact version strings.
- Runtime version markers advanced to 40.4.2.
- Preserves v40.4.1 VOD seek/A-V sync behavior.

# 40.4.1 — VOD Seek Build Fix

- Fixes the nullable duration calculation in the VOD HLS seek start endpoint that caused CS1503 during Release build.
- Keeps the v40.4.0 VOD seek and A/V sync behavior unchanged.
- Uses explicit `double` values and safely handles an unknown ffprobe duration.

# 40.4.0 — VOD Seek & A/V Sync Engine

- Adds a dedicated full-duration seek bar for Movies and Series.
- HLS fallback seeking now restarts FFmpeg at the requested source timestamp instead of trying to jump into segments that do not exist yet.
- Seek restarts use H.264/AAC compatibility mode for deterministic timestamps.
- Adds generated PTS, 2-second forced video keyframes and asynchronous audio resampling to reduce audio/video drift.
- Resume tracking stores the absolute movie/episode position across seek restarts.

# v40.3.1 – Player Layout Fix

- Fixes inline VOD video rendering only on the right side of a large black player surface.
- Adds a dedicated responsive 16:9 VOD stage with centered `object-fit: contain` rendering.
- Keeps fullscreen behavior intact and centered.
- Adds release regression checks for VOD player markup and CSS.
- Streaming Engine 2.0 remains unchanged from v40.3.0.

# v40.3.0 – Streaming Engine 2.0

- Direct byte-range playback for browser-compatible VOD (MP4/M4V/WebM/MOV).
- Preserves HTTP 206, Content-Range and Content-Length through the media proxy.
- Browser-native duration/seek timeline for direct VOD.
- HLS retained as compatibility fallback for MKV/TS/unsupported codecs.
- VOD HLS buffer increased and low-latency mode disabled.
- Waiting/stalled no longer triggers immediate recovery; 12-second progressive recovery gate added.
- Resume tracking remains independent from buffering/recovery.
- Streaming Engine 2.0 capability endpoint added.

# v40.2.1 — Playback Resilience & Resume Fix

- Saves VOD resume position every few seconds and on pause, buffering, stalls, seeks, errors, page hide and page exit.
- Restores Continue Watching position after media metadata is ready.
- Recovers HLS network/media errors in place before falling back to transcoding.
- Preserves the current playback position when compatibility fallback restarts the stream.
- Removes nearly completed items from Continue Watching at 95%.

## v40.2.0 — Home Experience 3.1
- Reduced Home hero height and typography on desktop.
- Restored Continue Watching as the first content rail.
- Added Continue Watching empty state.
- Removed redundant large shortcut tiles from Home.

# v40.1.2 — Frontend Syntax Fix

- Fixes invalid quoting in Home Experience 3.0 rail action markup that caused GitHub Actions `node --check app/wwwroot/app.js` to fail.
- Adds Node.js frontend syntax validation to the local RELEASE gate before commit/tag publication.
- Keeps Home Experience 3.0 and MyOnlineTV Experience 2.0 feature markers at 40.1.0; only the product release advances to 40.1.2.
- Leaves immutable v40.1.0 and v40.1.1 tags untouched.

# v40.1.1 — Release Gate Fix
- Corrected the v40.1.x release regression gate after Home Experience 3.0.
- Preserves Home Experience 3.0 feature version 40.1.0 and all existing application behavior.
- Keeps immutable v40.1.0 release/tag history intact; this maintenance release publishes as v40.1.1.
- Retains updater runtime-version validation, diagnostic VERSION publishing and Zero-Python policy.

# v40.1.0 — Home Experience 3.0
- Unified responsive Home for desktop, laptop, tablet, mobile and TV.
- Dynamic hero prioritizing Continue Watching.
- Rails: Continue Watching, Live Now, Favorites, Recently Added, Movies and Series.
- Quick navigation and improved keyboard/remote focus.
- Shared playback routing retained.
- Updater verifies `/health` runtime version after activation.
- Published app includes diagnostic `VERSION`.
- New permanent .NET regression tests; Zero-Python policy retained.

# v40.0.0 — MyOnlineTV Experience 2.0

- Activated the shared Experience Migration design contracts as the v40 presentation layer.
- Added unified Home, Library, Player Chrome and Profile Shell view models.
- Added consistent routing from Continue Watching, Favorites, Live TV, VOD and Downloads into shared playback.
- Added responsive behavior for mobile, tablet, desktop and TV.
- Retained legacy-compatible v39 routes during the v40 migration.
- Retained Profiles & Family policy, Search & Discovery, Downloads 2.1, Performance & Reliability and updater hardening.
- Added permanent .NET regression gates for v40 surfaces and shared playback routing.
- Zero-Python build/test/release/deployment remains enforced.

# v39.19.0 — Experience Migration

- Added the compatibility-first MyOnlineTV design-system bridge ahead of v40.
- Added shared spacing, radius, typography, motion and breakpoint tokens.
- Added shared MediaCard, Hero, Rail, Navigation and Dialog view models.
- Added explicit mobile, tablet, desktop and TV device adaptation.
- Added additive CSS component classes without replacing existing v39 selectors.
- Added focus-visible and reduced-motion accessibility behavior.
- Added permanent .NET regression checks for the design-system bridge.
- Retained every previous feature, security, updater and multi-user regression gate.
- Zero-Python build/test/release/deployment remains enforced.

# v39.18.0 — Performance & Reliability

- Added bounded in-memory client caching with TTL and LRU-style eviction.
- Added duplicate in-flight request coalescing.
- Added bounded chunking helpers for large IPTV/VOD collections.
- Added lightweight runtime timing samples and diagnostics.
- Added health probing with stale-cache bypass.
- Added optional browser memory snapshots where supported.
- Added permanent .NET regression checks for cache/request/diagnostic bounds.
- Retained all previous feature, security, updater and multi-user regression gates.
- Zero-Python build/test/release/deployment remains enforced.

# v39.17.0 — Downloads 2.1

- Added normalized queue/progress state for downloads.
- Added bounded retry eligibility and exponential retry backoff.
- Added storage usage/free-space calculations.
- Added completed-download offline library.
- Added series/episode grouping for downloaded episodes.
- Added cleanup-candidate selection for old completed and stale failed downloads.
- Added profile filtering for download presentation.
- Routed offline playback through Playback Engine 3.0.
- Retained all previous regression/security gates and added Downloads 2.1 .NET gates.
- Zero-Python build/test/release/deployment remains enforced.

# v39.16.0 — Profiles & Family 3.0

- Added normalized profile and family-policy helpers.
- Added profile-scoped local state keys.
- Added Kids-mode and Adult-content visibility policy.
- Added optional PIN-policy metadata support.
- Defined isolated profile areas for Favorites, Continue Watching, history, search history, downloads and recent channels.
- Added migration helper for Search & Discovery 2.0 recent searches.
- Existing server-side authorization and multi-user isolation remain authoritative.
- Retained every previous regression/security test and added new .NET Profiles & Family 3.0 gates.
- Zero-Python build/test/release/deployment remains enforced.

# v39.15.0 — Search & Discovery 2.0

- Added a unified discovery index for Live TV, Movies, Series and Episodes.
- Added cross-library search with media-type and group filtering.
- Added grouped search-result sections and query suggestions.
- Added profile-scoped recent searches with clear-history support.
- Routed search-result playback through Playback Engine 3.0.
- Retained every existing v39.14.0 and earlier regression/security gate.
- Added permanent .NET regression coverage for Search & Discovery 2.0.
- Zero-Python build/test/release/deployment remains enforced.

# v39.14.0 — Movies & Series 3.0

- Added a shared Movies & Series 3.0 VOD experience layer.
- Added normalized movie/series detail models and progress calculation.
- Added season/episode grouping and next-episode navigation.
- Added Resume and Start Over requests through Playback Engine 3.0.
- Added VOD search and title/year/recent sorting helpers.
- Retained all existing v39.13.1 updater, playback, Live TV, IPTV, Continue Watching, download, security and multi-user regression tests.
- Added permanent .NET regression coverage for Movies & Series 3.0.
- Zero-Python build/test/release/deployment policy remains enforced.

# v39.13.1 — Update Backup Hardening

- Excludes transient `live-hls` runtime data from pre-update backups.
- Keeps only the three newest successful `pre-update-*.tar.gz` backups.
- Performs retention cleanup only after the new backup succeeds.
- Leaves downloads and the backup directory excluded from recursive backup data.
- Adds permanent .NET release regression checks for backup exclusions and retention.
- Retains Playback Engine 3.0 and all existing regression/security gates.
- Zero-Python release/distribution policy remains enforced.

# v39.13.0 — Playback Engine 3.0

- Added a common playback request contract across primary media sources.
- Routed Continue Watching through Playback Engine 3.0.
- Added common Live TV recovery, unified media, direct URL, download and server-token paths.
- Added resume propagation and playback diagnostics.
- Added new .NET regression checks while retaining all previous tests.
- Zero-Python release policy remains enforced.

## v39.12.0 — Live TV 2.0

- Refined Live TV channel browser with Favourites, Recent and On now views.
- Added one-click EPG/Now-Next refresh without leaving Live TV.
- Added per-user/profile recent-channel cleanup while preserving account isolation.
- Expanded keyboard/remote navigation with mini-guide shortcut and existing fast zapping.
- Preserved Now/Next, recording, favourites, playback fallback and channel visibility behaviour.
- Added permanent .NET regression guards for Live TV 2.0 while retaining all earlier release tests.
- Distribution chain remains Python-free.

## v39.11.0 — IPTV Manager 2.0

- Dedicated IPTV Manager 2.0 overview with provider health, catalogue statistics and sync status.
- Live TV group and channel search/filtering with safe bulk activate/deactivate actions.
- Explicit Adult (18+) controls remain protected from normal bulk activation.
- Provider reload preview, full reload, automatic sync settings and sync diagnostics/history.
- Movies and Series category/title visibility management for Xtream providers.
- Smart filters plus export/import of provider visibility configuration.
- Existing multi-user provider ownership/isolation is preserved.
- Added permanent .NET regression coverage for IPTV Manager 2.0 while retaining all existing release tests.
- Distribution chain remains Python-free.

## v39.10.0 — Continue Watching 2.0
- Expanded Continue Watching controls, collection search/sort/progress, regression coverage, and hardened Python release environment.

# v39.9.3 - Adult Groups & IPTV Diagnostics

- Add Adult (18+) controls directly to My Sources > Edit IPTV > Live TV.
- Add group search and All/Adult/Active/Inactive filters.
- Show loaded group/channel counts and detected Adult group/channel counts.
- Add Reload Live TV action for provider refresh and diagnostics.
- Raise the Live TV import ceiling from 20,000 to 100,000 channels so providers with large catalogues do not silently lose later groups.
- Add release regression guards for Adult controls and the expanded import ceiling.

# v39.9.2 - Playback Routing Fix

- Fix Continue Watching playback on Home when the layout has no pre-rendered media player host.
- Start movie favourites directly from Home/My List.
- Strengthen playback release regression gate.

## v39.9.1 - Playback Regression & Release Gate
- Fixed playback launch from IPTV movie favourites across desktop, mobile, tablet and TV home surfaces.
- Added Continue Watching compatibility resolver for older profile-scoped entries.
- Added playback-surface regression tests to the release gate.

# v39.9.0 - Downloads 2.0

- Persistent per-user download queue/history across service restarts.
- Real cancellation tokens for active downloads and safe retry handling.
- Batch download API for movie/episode sets with per-item validation.
- Download Manager summary with queued/active/completed/failed counts and storage usage.
- Improved download UI with status filters, history controls, progress auto-refresh and clearer errors.
- Release dashboard now shows the active GitHub Actions job/step instead of repeating `in_progress`, and prints failed logs automatically.
- Multi-user isolation remains mandatory for all download operations.

## 39.8.5 (release candidate) — Stabilization

- Stabilization-only follow-up to v39.8.4; no new product feature surface is introduced.
- Promote v39.8.4 to the established released baseline and protect the next patch calculation so the historical v37.1.0 anomaly cannot regress versioning.
- Add an LXC runtime smoke-test script for health, readiness and deployed-version verification after upgrade.
- Harden `RELEASE.ps1`/`PUBLISH.ps1` GitHub release discovery by projecting release tag names with `gh --jq`, avoiding the paginated/slurped JSON shape failure seen during the first v39.8.5 release attempt.
- Keep the v39.8.4 multi-user isolation, Continue Watching ownership, Unicode download handling and release gates unchanged.
- Require runtime smoke verification before v39.8.5 publication.

## 39.8.4 (release candidate)

- Restore the established 39.8.x version line and assembly-derived product metadata; preserve the historical v37.1.0 tag.
- Isolate Continue Watching, favourites, profile media state, rooms and notifications by account. Remove or clear progress persistently without deleting media or watchlist entries; rewatching can add it again.
- Enforce token, download, playback-session, provider, media-library and DVR ownership. Prevent account recreation from inheriting old cookies or sources and isolate browser caches/history.
- Use an ASCII filename fallback and RFC-compatible UTF-8 filename* for Unicode downloads.
- Preserve the mobile redesign and add accessible navigation, menus, detail history, collection actions, responsive Guide/player layouts and Continue Watching controls for desktop, phone, tablet and TV.
- Add real multi-user API, persistence, browser and download-header regression tests, plus immutable-tag/version guards in the existing release process.
- Preserve the release-upload recovery and artifact verification changes introduced after v39.8.3.

Release candidate only: native-client/target-LXC validation and review of functionality removed by the anomalous v37.1.0 commit remain required. See MULTI-USER-AUDIT.md.

## 37.1.0

- Mobile Experience Redesign: dedicated Home, Live TV, Movies, Series, navigation and mobile Library Management layouts.
- Live TV now uses player-first composition, group bottom sheet, EPG-rich channel rows and quality badges.
- Replaced the mobile Guide bottom-nav slot with Series; Guide remains available from More and Live/Home.

## 37.0.2

- Release Verification Fix: REST API release verification, draft recovery, asset validation, Node 24-compatible action versions.

## 37.0.1 - Resilient GitHub Release Upload

- Keeps all v37.0.0 Library Management & Provider Refresh features.
- Creates the GitHub release without assets first, then uploads each mandatory asset separately.
- Retries transient GitHub upload failures (HTTP 5xx / temp-dir failures) with exponential backoff.
- Resumes an existing partial release for the same tag and replaces individual assets safely.
- Verifies all mandatory assets are present and non-empty before marking the release latest.

# v37.0.0 – Library Management & Provider Refresh

- New Library Management UI for Groups, Channels, Movies and Series.
- Bulk channel hide/show and persistent group/category/item visibility.
- Live provider refresh with added/changed/removed/unchanged diff.
- Per-group quality filters: RAW, 4K/UHD, FHD, HD, SD and Unknown.
- Configurable quality priority and Best available only deduplication.
- Provider refresh settings (Manual / Every X hours / Daily).
- Cleanup Center for duplicate-looking channels, missing logos and ungrouped content.
- Group refresh action and persistent local preferences across refresh.

# v36.5.7 — Release Asset Upload Fix

- Removes the custom release-ID / `uploads.github.com` asset-upload implementation.
- Uses the supported `gh release create TAG files...` flow so GitHub CLI handles draft creation, asset upload and publication as one release operation.
- Verifies the public release and all four mandatory non-empty assets after creation.
- Keeps the v36.5.6 Mobile & Tablet Scroll Fix unchanged.

# v36.5.6 — Mobile & Tablet Scroll Fix

- Restores reliable vertical touch scrolling on mobile and tablet layouts.
- Keeps fixed mobile bottom navigation while allowing the main page to scroll.
- Preserves horizontal swipe rails for Continue Watching, Movies, Series and similar content.
- Tablet landscape keeps the compact sidebar sticky while the main content scrolls.
- Tablet portrait uses the same safe vertical scrolling model as mobile.
- Live channel pane remains independently scrollable.

## v36.5.5 – Release ID Direct Creation
- Fixed atomic GitHub Release creation/upload to use the numeric release ID end-to-end.

# v36.5.4 – Atomic Release Draft-ID Fix

- Fixes GitHub Release publication for draft releases by resolving and using the draft release ID.
- Verifies all four mandatory assets against the draft release ID before publication.
- Publishes with the GitHub Releases API only after asset verification succeeds.
- Prevents incomplete releases from becoming Latest.
- Includes the v36.5.3 release-integrity changes and mobile/tablet Live channel fixes.

# v36.5.3 – Release Integrity Fix

- Prevent incomplete GitHub Releases from becoming Latest.
- Verify all mandatory release assets before publishing.
- Make release reruns safe with asset replacement.
- Bypass stale latest-release caches in the Proxmox updater.
- Includes v36.5.1 mobile and v36.5.2 tablet Live channel fixes.

## v36.5.2 – Tablet Live Channel Fix

- Scopes tablet sidebar CSS to the app navigation only (`#app > aside`).
- Keeps the nested Live TV channel pane visible and selectable in tablet portrait and landscape.
- Prevents tablet navigation sizing rules from being applied to the Live channel pane.
- Includes the v36.5.1 mobile Live channel fix.

# v36.5.1 — Mobile Live Channel Fix

- Fixes Live on phones: the channel selector is visible and channels can be selected again.
- Scopes the mobile sidebar hiding rule to the main application navigation instead of every `<aside>`, which had also hidden the Live channel pane.
- Preserves the v36.5.0 Tablet Experience and v36.4.0 Mobile Experience.

# Changelog

## v36.5.0 – Tablet Experience
- Dedicated tablet Home UI instead of a scaled desktop/mobile layout.
- Compact touch-first navigation for landscape tablets and bottom navigation in portrait.
- Tablet-specific header with search and profile controls.
- Two-column Live Now cards, horizontal Continue Watching and media rails.
- Tablet card sizes, spacing and touch targets tuned for 720–1179 px viewports.
- TV, desktop and phone experiences remain independent.


## v36.4.0 — Mobile Experience
- Dedicated thumb-first mobile Home; no desktop Hero on phones.
- Compact mobile brand/profile header.
- Bottom navigation is Home / Live / Guide / Movies / More.
- Compact Continue Watching, Live Now, Continue Series, Movies, My List and Series surfaces.
- Existing TV and desktop experiences remain independent.

## 36.3.1 — Desktop Header Polish
- Desktop header right side now groups profile avatar/name, divider, localized date and live clock.
- Sidebar brand is compact: MyOnlineTV with the app logo directly after the name on the same row.
- Preserves the v36.3.0 Desktop Home Redesign and TV/mobile layouts.

## 36.3.0 — Desktop Home Redesign

- Removes the large desktop/laptop Hero and the permanent Up Next / Live Today side column.
- Makes desktop Home a content-first browser with Continue Watching, Live Now, My List, Recently Added Movies and Continue Series.
- Moves global search into the desktop top bar alongside Home/profile controls.
- Uses compact landscape cards for Continue Watching and media rails, with progress and hover actions.
- Keeps Live Now as a dedicated information-rich row with channel/programme progress.
- Preserves the v36.1 cinematic TV Home and existing tablet/mobile layouts.
- Keeps runtime VERSION -> backend -> Web UI version reporting unchanged.

## 36.2.6 — Desktop Hero Composition Fix

- Fixes the duplicated/zoomed portrait artwork seen in the laptop Hero.
- Landscape backdrops remain full-bleed with a controlled readability gradient.
- Portrait-only media now uses one clean poster on the right over a neutral cinematic background.
- Removes the blurred/duplicated poster background that made Hero look visually split.
- Keeps the compact laptop Hero height and MyOnlineTV + logo branding.

## v36.2.5 — Desktop Hero Artwork Composition
- Desktop Hero now prefers a matching library landscape backdrop for Continue Watching.
- Portrait-only artwork uses an ambient blurred fill plus a deliberate framed poster instead of a tiny contained image.
- Landscape artwork fills the Hero with controlled cropping and readable text gradients.
- Keeps the compact v36.2.3 laptop Hero height and the v36.2.4 single-line brand.

## v36.2.4 – Desktop Hero Artwork & Brand Cleanup
- Fixed desktop/laptop hero artwork scaling/cropping.
- Simplified sidebar branding to MyOnlineTV + logo on one row.
- Removed redundant sidebar Web/version subtitle.

# v36.2.3 — Desktop Hero Hard Cap

- Fixed the laptop/desktop Home hero sizing rule so the browser actually applies it.
- Removed accidental literal `\n` tokens that invalidated the v36.2.2 CSS rule.
- Desktop hero is hard-capped to 260 px (220 px on low-height laptops).
- Hero title is limited to two lines and description to one line.
- TV and touch layouts are unchanged.

## v36.2.2 – Laptop Home Density Fix
- Fixes oversized Continue Watching hero on laptop: hero now has a bounded height instead of min-height.
- Caps long hero titles to two lines and descriptions to two lines.
- Continue Watching cards use a compact 16:9 thumbnail height on laptop.
- Compresses Live Now and section spacing on short laptop viewports.
- TV and large-screen desktop layouts are unchanged.

# v36.2.1 — Laptop Layout Fix

- Compact laptop-specific Desktop Home layout for common 1366×768 and 1920×1080 browser viewports.
- Continue Watching cards reduced to roughly 175–220 px wide with a 16:9 image capped at 105–124 px on laptop layouts.
- Desktop hero reduced to roughly 240–300 px on shorter/finer-pointer screens.
- Tighter section spacing and compact Live Now cards so more content remains above the fold.
- Large desktop, TV, tablet and mobile layouts remain unchanged.

## v36.2.0 — Desktop Home Experience

- New content-first laptop/desktop Home experience inspired by the v36 desktop concept.
- Compact global search bar and profile-aware desktop header.
- Cinematic hero with contextual Continue Watching, featured media, or Live TV action.
- Dedicated Up Next and Live Today side panel on wide screens.
- Desktop rails for Continue Watching, Live Now, My List, Movies and Series.
- Mouse hover quick actions, playback progress and EPG progress indicators.
- TV keeps the v36.1 ten-foot Home; tablet/mobile keep their existing responsive Home.
- VERSION remains the single build/runtime/UI version source.

# Changelog

## v36.1.0 – TV Home Experience

- New content-first 10-foot Home for TV Product Experience.
- Dynamic hero selects Continue Watching, Live Now, or available media.
- Sofa-friendly horizontal rails for Continue Watching, Live Now, My List, Movies and Series.
- Larger remote focus targets, overscan-safe spacing and cinematic backdrop treatment.
- TV Home uses existing profile-aware Continue Watching, favourites, unified media and EPG data.
- Desktop and mobile retain their existing Home experience.
- VERSION remains the single build/runtime/UI version source.

# v36.0.0 — TV Product Experience

- Dedicated ten-foot TV shell layered on the existing responsive application.
- Persistent remote-first navigation with Home/Menu launcher and predictable Back behavior.
- Stronger focus memory, focus visibility and automatic focused-card centering.
- TV playback overlay with Play/Pause, Guide, Live TV and Home actions.
- Idle playback chrome that gets out of the way while watching.
- Remote help overlay and keyboard/media-key mappings for TV testing.
- TV-safe overscan spacing, larger typography/targets and reduced UI density.
- Existing Live TV, Guide, Movies, Series and profile sync remain the underlying product features.

# v35.4.0 — Cross-device & Profiles

- Profile-scoped server favourites and Continue Watching.
- Cross-device watched state, media favourites and recent activity.
- Secure profile-state access checks.
- Profile switching hydrates state before Home.

# v35.3.0 — TV Guide Experience

- New 30-minute EPG timeline and stronger Now marker.
- Sticky channel/time headers and improved TV/D-pad focus.
- Programme details with Watch, Record, Record series and Reminder.
- Responsive guide experience across TV, desktop, tablet and mobile.

# Changelog

## 35.2.0 — Movies & Series Experience
- Cinematic movie and series detail views with poster/backdrop presentation and metadata.
- Movie browsing gains title/year/rating sorting and genre-aware search.
- Movie cards surface watched/favourite state and direct playback.
- Movie detail adds Play, Favourite, Download and watched-state actions.
- Series detail adds Start/Continue series, watched progress and next-unwatched episode.
- Season tabs replace the long all-seasons list.
- Episode cards are redesigned for TV, desktop, tablet and mobile.
- Existing resume tracking, next-episode playback, downloads and provider APIs are preserved.
- Product version remains sourced from VERSION -> assembly -> runtime UI.

## 35.1.0 — Live TV Experience
- Faster TV-first channel zapping with existing Now/Next overlay and mini-guide.
- Remote/keyboard channel switching extended with Page Up/Down and media next/previous keys.
- Numeric channel entry retained and integrated with the Live TV experience.
- Quick Favourites and Recent filters in the Live toolbar.
- Mobile horizontal swipe to change channels.
- Guarded stream-stall recovery with one compatibility-transcode retry.
- Media Session previous/next channel integration where supported.
- TV focus/readability and Live playback status polish.
- Product version remains sourced from VERSION -> assembly -> runtime UI.

# v35.0.3 — Runtime Version Truth

- Runtime version is now sourced from the built application for every Web UI version label and status endpoint. No UI version is read from installer metadata.
- Release pipeline remains PUBLISH.cmd → GitHub Release → latest install/update from Proxmox without VERSION.

# v35.0.2 — Permanent Publish & Proxmox Deployment Repair

- Replaced the fragile Proxmox bootstrap path with self-contained install and update launchers.
- Install and update now resolve the latest published GitHub Release automatically when VERSION is omitted.
- Release source, application artifact and checksums are downloaded together and verified before deployment.
- PUBLISH now builds locally, commits, pushes main, creates an immutable version tag, waits for GitHub Actions, and verifies all GitHub Release assets.
- Added deployment regression gates for the `target: unbound variable` failure and bootstrap dependencies.
- VERSION remains optional only for explicit pin/rollback scenarios.

# v35.0.1 — Deployment Reliability Hotfix

- Fixed `target: unbound variable` in the shared GitHub deployment bootstrap.
- Hardened `PUBLISH.ps1` when local or remote release tags do not yet exist.
- Added a deployment regression gate to every GitHub release build.
- Normal install/update defaults to the latest published stable GitHub Release when VERSION is omitted.
- Exact VERSION remains optional for pinning or rollback.

# v35.0.0 — Unified Media Experience

- Introduced the new cross-device product UI for TV, desktop, tablet and mobile.
- Added a cinematic Home hero with direct Live TV and Guide actions plus universal search.
- Reworked content rails, media cards, Live Now presentation and visual hierarchy.
- Changed mobile primary navigation to Home, Live, Movies, Search and More.
- Moved Guide into the mobile More sheet while retaining full desktop/TV navigation.
- Added dedicated phone, tablet and ten-foot TV layouts with larger remote targets and stronger focus treatment.
- Preserved the existing IPTV, EPG, movie, series, profile, DVR and media-library backend behavior.
- Added reduced-motion accessibility handling.

# v34.4.0 — Distribution Edition

- GitHub Releases are now the canonical LXC distribution source.
- Added one-command stable install and upgrade flows.
- Added automatic CTID and Proxmox storage selection for new installs.
- Added VERSION=x.y.z pinning for deterministic installs/upgrades.
- Stable deployment now requires a real published release and verified checksum.
- Preserved backup, health/readiness validation and automatic rollback during upgrades.

## v34.3.0 — Provider Selection UX
- Faster, clearer IPTV group/channel selection across devices with bulk controls, search, counts and one-request saving.

# v34.2.0

- Added native Apple TV / tvOS client with SwiftUI and AVPlayer.
- Uses existing MyOnlineTV accounts, per-user sources and server-side IPTV visibility filtering.
- Added login, mandatory password change, onboarding handoff, Live TV, Movies, Series and playback.

# v34.1.2

- Fix: Edit IPTV from My Sources no longer crashes with `Cannot set properties of null (setting value)`.
- Added dedicated personal IPTV source editor with Connection, Live TV, Movies and Series tabs.
- Live TV: hide/show complete groups and individual channels.
- Movies: hide/show Xtream categories and individual movies.
- Series: hide/show Xtream categories and individual series.
- Hidden IPTV catalogue content is filtered by the server during normal browsing.
- Added reset controls for Live TV, Movies and Series visibility.

# v34.1.1

- Fix: Personal Media Setup now opens automatically on a new user's first usable login.
- Fix: forced temporary-password change continues directly into setup.
- Fix: newly created accounts always receive a clean onboarding state.

## v31.2.0 — GitHub UI Updater
- Visible update-available indicator for administrators.
- New Admin → System → System Update page.
- GitHub latest-release check with cache and manual refresh.
- Secure admin-only UI update queue.
- Root-owned systemd path/service worker instead of sudo access for the web process.
- SHA-256 release verification, backup, health checks and automatic rollback.
- Releases must explicitly opt in to UI self-update protocol v1.

## v31.2.0 — Onboarding Buttons Fix
- Fixed missing Skip for now button on the actual first onboarding page.
- Fixed missing Never show this guide again button on the actual first onboarding page.
- Improved IPTV/Plex/Jellyfin choice-card text layout.
- Manual Run setup guide continues to use Cancel instead of permanent dismissal buttons.

## v31.2.0 — Never Show Onboarding Guide
- Added a per-user permanent "Never show this guide again" option.
- Added `/api/onboarding/never-show`.
- Automatic onboarding respects the permanent suppression flag.
- Manually restarting setup clears the suppression flag.

## v31.2.0 — Onboarding Skip Hotfix
- Added persistent per-user Skip for onboarding.
- Fixed guide showing again after every login.
- Added restart-onboarding API and UI helper.
- Removed source requirement from onboarding completion.

## v31.2.0 — SQLite Database & Migration
- Adds SQLite with WAL mode and schema migrations.
- Adds persistent tables for users, source ownership, source health, EPG aliases, media index and user settings.
- Keeps legacy JSON files readable during migration so upgrades are non-destructive.
- Adds `/api/database/status`.

## v31.2.0 — Stable Personal Media Edition
- Adds the v31 production gate and Stable Personal Media Edition marker.
- Preserves zero mandatory runtime cost.
- Explicitly requires real playback, restart, upgrade and two-user isolation tests before calling the release production-verified.

## v31.2.0 — TV & Remote UX
- Improves coarse-pointer/remote hit targets and visible focus.
- Adds reduced-motion behavior.
- Adds a TV/remote capability endpoint for D-pad, Back and focus restoration.

## v31.2.0 — Unified Library & Search
- Adds deterministic client-side unified-media deduplication helpers.
- Adds a per-user Unified Library v4 status contract.
- Defines source preference for duplicate media and global-search capability.

## v31.2.0 — Live TV & Guide 4.0
- Adds the Live TV/Guide 4.0 capability contract for mini-guide, previous channel, numeric selection and D-pad navigation.
- Adds stronger TV focus treatment.
- Provider visibility remains personal.

## v31.2.0 — Playback Engine 4.0
- Defines the Playback Engine 4.0 strategy order: Direct Play → HLS → FFmpeg fallback.
- Exposes resume/live-recovery capabilities.
- Keeps playback source resolution behind per-user ownership checks.

## v31.2.0 — Source Doctor
- Adds a Source Doctor summary for the current user's own sources.
- Provides a stable surface for connection health and repair UI.
- Does not expose other users' source identifiers.

## v31.2.0 — Home 4.0
- Adds a personal Home composition endpoint based only on the signed-in user's sources.
- Adds a first-class empty Home state that links back to setup.
- Home capability flags hide irrelevant source sections.

## v31.2.0 — User & Source Architecture Cleanup
- Formalizes per-user source ownership as the active architecture.
- Cross-user source sharing is disabled.
- Adds a diagnostic ownership contract endpoint.
- Existing source access continues to be enforced server-side.

## v31.2.0 — Personal Media Setup 2.0
- Added choose-your-services first-login flow.
- Added pre-save IPTV/Plex/Jellyfin connection tests.
- Added IPTV group and Plex/Jellyfin library selection during onboarding.
- Added rerunnable setup guide and useful empty Home state.
- Rebuilt My Sources around actual per-user source ownership.
- Cross-user source probing now returns 404.

## v31.2.0 — Account Source Isolation
- Made IPTV/Plex/Jellyfin account-scoped instead of globally shared.
- Added explicit per-source sharing to same-account users only.
- Added server-side cross-account access enforcement for source-specific routes.
- Filtered Unified Media and Live Now/Next by source visibility.
- Added Admin 2.0 Share controls on IPTV/Plex/Jellyfin source cards.

## v31.2.0 — Update Safety Hotfix
- Hardened final backend/nginx verification.
- Failed final verification now activates and verifies binary rollback.
- Suppressed harmless transient connection-refused retry noise.
- `Update verified` is emitted only after all final checks pass.

## v31.2.0 — Production Edition
- Added the Production Edition increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Full UX Polish
- Added the Full UX Polish increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Observability & Admin Diagnostics
- Added the Observability & Admin Diagnostics increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Performance & Media Index
- Added the Performance & Media Index increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Security Hardening
- Added the Security Hardening increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Installer, Updater & Rollback
- Added the Installer, Updater & Rollback increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Self-Healing Appliance
- Added the Self-Healing Appliance increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Notification Center
- Added the Notification Center increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Smart Home, EPG & Sports
- Added the Smart Home, EPG & Sports increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Mobile Companion & Remote
- Added the Mobile Companion & Remote increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Android TV & TV UX
- Added the Android TV & TV UX increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — DVR Production
- Added the DVR Production increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Unified Media Production
- Added the Unified Media Production increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Guide Production
- Added the Guide Production increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Live TV Production
- Added the Live TV Production increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Unified Playback Engine
- Added the Unified Playback Engine increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — UX Consistency & Navigation
- Added the UX Consistency & Navigation increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Error, Loading & Empty States
- Added the Error, Loading & Empty States increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Stabilization & Cleanup
- Added the Stabilization & Cleanup increment and release verification gate.
- Preserved zero mandatory runtime cost.

## v31.2.0 — Admin 2.0
- Replaced the monolithic Admin page with a task-oriented six-section interface.
- Added actionable Overview, Needs Attention and Quick Actions.
- Redesigned Sources, Users & Profiles, Storage, Navigation and System administration.
- Added responsive/mobile Admin UX while preserving existing backend routes.

## v31.2.0 — Architecture & Code Quality
- Added Architecture & Code Quality implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Self-Healing Appliance
- Added Self-Healing Appliance implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Cinema & Screensaver
- Added Cinema & Screensaver implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Family & Guest
- Added Family & Guest implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Sports Hub
- Added Sports Hub implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Smart Collections
- Added Smart Collections implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Unified Watchlist
- Added Unified Watchlist implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — What's On Tonight
- Added What's On Tonight implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Smart EPG
- Added Smart EPG implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Notification Center
- Added Notification Center implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Stream Doctor
- Added Stream Doctor implementation increment.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Advanced TV Platform
- Provider-gated Catch-up/Start Over plus PiP/Multi-view/Sports platform.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Rooms & Handoff
- Local room playback ownership and handoff contract.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Phone Remote & Pairing
- Local expiring pairing and validated remote commands.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Android TV First-class
- D-pad, Media3 and HLS-readiness Android-TV contract.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Multi-device Platform
- Browser/mobile/tablet/TV/Android-TV device platform.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Universal Search
- One local search domain across TV, EPG, media and recordings.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Personal Home
- Personal local Home rail composition.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Profiles 2.0
- Profile, kids-mode and per-profile preference contract.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Playback Resilience
- Bounded playback fallback plan and useful error stages.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Playback Engine 2.0
- Central direct/HLS/remux/transcode decision policy.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Unified Library 4.0
- Deterministic dedupe and best-source policy.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Live TV 4.0
- TV-first zapping, Now/Next and previous-channel capabilities.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Server Media Index
- Local searchable media-index contract.
- Zero mandatory runtime cost preserved.

## v31.2.0 — Performance & Diagnostics
- Local performance measurements and diagnostics.
- Zero mandatory runtime cost preserved.

## v31.2.0
- New TV-first Live TV layout with compact channel rail and player/program panel.
- Hide-channel action moved to the right-side action group.
- Added current/next programme details and progress to Live TV.
- Added Home “On TV now” rail.
- Refined EPG styling and responsive TV/tablet layout.

# v31.2.0 — Feature Completion

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


### 39.12.0 RC2
- Continue API hardening: profile-scoped serialized persistence and expanded black-box regression coverage.

## v40.6.0
- Continuous VOD seek handover and stall recovery; retained contained player layout.
