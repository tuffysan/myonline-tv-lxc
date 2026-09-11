# MyOnline TV Web v20.2.1 — Proxmox LXC

MyOnline TV Web is a self-hosted entertainment appliance for Proxmox VE.

## v0.3.12 reverse-proxy fix

v0.3.12 fixes provider POST requests behind an upstream HTTPS reverse proxy such as Nginx Proxy Manager. The local LXC Nginx preserves the incoming external host and scheme and forwards them to ASP.NET Core, while direct LAN access falls back to the local request values. All proxy headers are defined in `location /` to avoid Nginx header-inheritance surprises. The sidebar version is read dynamically from `/api/status`, and the updater now prints precise failure diagnostics.


## Install

Run on the Proxmox host as root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

The default **stable** channel resolves the latest GitHub Release, downloads the prebuilt `linux-x64` application artifact, verifies its SHA-256 checksum, creates the Debian LXC and installs only the ASP.NET Core 10 runtime, Nginx and FFmpeg.

Default CT:

```text
CTID:     145
Hostname: myonlinetv
CPU:      2 cores
RAM:      2048 MB
Disk:     16 GB
Network:  DHCP
Storage:  local-lvm
```

Custom example:

```bash
CTID=150 MEMORY=4096 CORES=4 DISK=32 \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```


## Architecture-safe LXC template selection

v0.3.12 detects the Proxmox host architecture before creating the container:

```text
x86_64        -> amd64
aarch64/arm64 -> arm64
```

The installer then selects only a matching Debian 13/12 template. For example, an x86_64 Proxmox host will select a template such as:

```text
debian-13-standard_13.6-1_amd64.tar.zst
```

and will refuse:

```text
debian-13-standard_13.6-1_arm64.tar.zst
```

A second verification is performed after `pct create`; a mismatched container is removed automatically instead of being started.


## v0.3.12 installation verification

The installer now verifies the full request path, not only the ASP.NET backend:

```text
Browser/Nginx :80 -> MyOnline TV :5080
```

Before reporting a successful installation it checks `/health` and `/ready` through both port `5080` and Nginx port `80`. It also fails if the standard Nginx welcome page is still active.


## v0.3.12 persistent-data permissions

`myonlinetv.service` runs as `www-data`. Before starting the service, the installer now prepares persistent storage with:

```bash
chown -R www-data:www-data /var/lib/myonlinetv
chmod 700 /var/lib/myonlinetv
chmod 700 /var/lib/myonlinetv/downloads
chmod 700 /var/lib/myonlinetv/backups
```

This allows first-run creation of `secrets.key` and application state.


## v0.3.12 behind HTTPS reverse proxies

MyOnline TV is designed to sit behind an external HTTPS reverse proxy such as Nginx Proxy Manager:

```text
Browser (HTTPS)
  -> Nginx Proxy Manager
  -> MyOnline TV Nginx :80
  -> ASP.NET Core 1220.2.1.1:5080
```

Recommended Nginx Proxy Manager target:

```text
Scheme: http
Forward Host/IP: <MyOnline-TV-LXC-IP>
Forward Port: 80
```

`X-Forwarded-Proto` is preserved by the internal Nginx and processed by ASP.NET Core, so same-origin checks correctly see `https://your-domain` rather than the internal HTTP hop.

Kestrel is bound to loopback only in v0.3.12, so port 5080 should not be exposed directly.


## v0.3.12 upgrade migrations

Starting with v0.3.12, upgrades migrate system configuration as well as application binaries. The updater reapplies and validates the current Nginx reverse-proxy configuration, restarts the services, and checks both the backend and port-80 proxy path.

Existing containers are also renamed to:

```text
MyOnlineTV
```

New installations use the same hostname by default.

For Nginx Proxy Manager, continue to use:

```text
Scheme: http
Forward Host/IP: <MyOnline-TV-LXC-IP>
Forward Port: 80
```


## v0.3.12 installer fixes

Fresh installs now explicitly load the shared installer helper functions before the Nginx stage. The container hostname uses `CT_HOSTNAME` instead of the shell's built-in `HOSTNAME` environment variable.

Default:

```text
CT_HOSTNAME=MyOnlineTV
```

Optional override:

```bash
CT_HOSTNAME=MyTV CTID=145 bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```


## v0.3.12 reverse-proxy origin handling

Authenticated POST/PUT/PATCH/DELETE requests keep same-origin protection, but the comparison is now normalized by scheme, host, and effective port. This avoids false rejections for equivalent origins such as:

```text
https://tv.example.com
https://tv.example.com:443
```

The application also binds only to `1220.2.1.1:5080`; Nginx remains the public entry point on port 80.

## Update

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/update-from-github.sh)"
```

Before activating a new version, v0.3.12 creates:

```text
/var/lib/myonlinetv/backups/pre-update-<old>-to-<new>-<timestamp>.tar.gz
```

It then keeps an application rollback snapshot, activates the release, calls `/health` and `/ready`, and automatically rolls back the binaries if validation fails.

## Rollback

Application only:

```bash
CTID=145 ./rollback.sh
```

Application + last pre-update data snapshot:

```bash
CTID=145 RESTORE_DATA=1 ./rollback.sh
```

Downloads are deliberately excluded from automatic data rollback.

## Health check

```bash
CTID=145 ./health-check.sh
```

v0.3.12 exposes:

```text
GET /health
GET /ready
```

`/health` verifies the process is alive. `/ready` verifies writable persistent storage, the encryption key and important appliance prerequisites.

## System page

The web UI now includes **System** showing:

- application/schema version;
- uptime;
- runtime/OS;
- disk usage;
- FFmpeg availability;
- provider count;
- provider connectivity and response latency;
- backup count;
- manual configuration backup.

## GitHub release model

Every `v*` tag builds:

```text
myonline-tv-web-v0.3.12-linux-x64.tar.gz
myonline-tv-lxc-v0.3.12-source.tar.gz
SHA256SUMS-RELEASE.txt
release.json
```

The stable installer uses the first artifact. This avoids restoring NuGet packages and compiling the app during normal Proxmox installation.

`main` is still supported for development:

```bash
MYONLINE_CHANNEL=main \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

Development/main mode falls back to building source in the container and therefore installs the .NET SDK.

## Core features

- authenticated administrator account;
- encrypted IPTV provider credentials;
- M3U and Xtream-compatible providers;
- Live TV;
- XMLTV EPG;
- Movies and Series;
- artwork/posters;
- favourites;
- Continue Watching data;
- HLS/browser playback;
- server-side media proxy;
- video downloads for authorized direct/non-encrypted media;
- FFmpeg HLS processing;
- System/Admin appliance status;
- backup and rollback.

MyOnline TV does not bypass DRM, protected downloads or subscription access controls.

## Persistent data

```text
/var/lib/myonlinetv/
├── version
├── release.json
├── admin.json
├── secrets.key
├── providers.json
├── favourites.json
├── continue-watching.json
├── downloads/
└── backups/
```

Back up `secrets.key` together with encrypted provider data.

## Security

The bundled Nginx configuration defaults to HTTP for trusted LAN deployment. Do not directly expose it to the public Internet. Use HTTPS and preferably Tailscale/VPN or a properly secured reverse proxy for remote access.


## Live TV browser playback (v0.7.0)

Raw MPEG-TS/`video/mp2t` Live TV streams are now converted to browser-compatible HLS by FFmpeg inside the LXC. The default path uses stream-copy remuxing (`-c copy`) for low CPU use. If hls.js reports a fatal codec/playback failure, the web UI retries once with H.264/AAC compatibility transcoding. Switching channel stops the previous FFmpeg session and removes temporary HLS segments. Provider source URLs and credentials remain server-side.

### Live TV channel cache and startup flow

v0.7.0 caches each provider's Live TV channel metadata for 10 minutes. Once a cache exists, stale data is returned immediately while refresh runs in the background. Artwork proxying is lazy, which avoids generating tens of thousands of proxy entries during a channel refresh. Live TV playback no longer uses a temporary in-memory playback token: the browser sends the provider ID and channel key to the server, which resolves the protected source URL from the server-side channel cache. FFmpeg startup remains asynchronous: the browser starts a session and polls its status until HLS is ready, so a slow stream cannot hold an Nginx request open until a gateway timeout.

## Release naming

For v0.7.0 and later, the preferred Git tag format is:

```text
v0.7.0
```

The release workflow also accepts the legacy form `v.0.7.0`, and the updater normalizes both forms when locating release artifacts.

A successful GitHub Release must contain these generated assets in addition to GitHub's automatic source archives:

```text
myonline-tv-web-v0.7.0-linux-x64.tar.gz
myonline-tv-lxc-v0.7.0-source.tar.gz
SHA256SUMS-RELEASE.txt
release.json
```

If only `Source code (zip)` and `Source code (tar.gz)` are shown, the Release workflow did not finish successfully and the Proxmox updater should not be run yet.

## Stable baseline: v0.7.0

v0.7.0 deliberately uses the last user-confirmed working application baseline (v0.4.6) for Live TV, Guide, Movies and Series, while retaining the corrected GitHub release/update infrastructure.

Create the release tag as:

```text
v0.7.0
```

A successful GitHub Release must contain:

```text
myonline-tv-web-v0.7.0-linux-x64.tar.gz
myonline-tv-lxc-v0.7.0-source.tar.gz
SHA256SUMS-RELEASE.txt
release.json
```

## v0.7.0 updater correction

v0.7.0 fixes a false "required asset is missing" error in `scripts/github-common.sh`.
The updater now treats a successful `curl` as success, verifies that the file is non-empty,
downloads `SHA256SUMS-RELEASE.txt`, and validates the release archive checksum before installation.

## v0.7.1 — Plex/Jellyfin completion

v0.7.1 keeps the working v0.7.0 baseline and finishes the first media-library integration pass:

- Admin can discover and select which Plex/Jellyfin libraries are enabled.
- Existing library selections are preserved while editing connection settings.
- Plex/Jellyfin artwork is exposed through short-lived MyOnline TV proxy URLs instead of putting server tokens/API keys in browser image URLs.
- Series items open an episode browser instead of being treated as directly playable media.
- Episodes can be started through the existing server-side playback pipeline.
- Unified-media playback gets stable Continue Watching IDs so Plex/Jellyfin items can be resumed through the app.
- `PUBLISH.ps1` retains the local .NET build preflight when the SDK is installed.

## v0.7.2 — Media Center UX

v0.7.2 builds on v0.7.1 with a more TV-like day-to-day experience:

- Smarter Home with Recently Added Plex/Jellyfin media.
- Improved global Search with result-type filters and direct Plex/Jellyfin actions.
- Unified Plex/Jellyfin playback now uses the proven server-side FFmpeg/HLS player path.
- Continue Watching resumes Plex/Jellyfin media at the saved position.
- Unified Series keeps episode context and offers the next episode after playback.
- Better remote-control focus treatment for horizontal media rails.
- Existing Live TV, Guide, IPTV Movies/Series and Admin functionality remains cumulative from v0.7.1.

## v0.8.0 — DVR & Live TV Recording

v0.8.0 introduces the first DVR milestone:

- Schedule Live TV recordings from a dedicated Recordings view.
- Shift+click a programme in Guide to schedule the programme window directly.
- Server-side FFmpeg recording with stream-copy to MPEG-TS.
- Persistent recording queue across application restarts.
- Recording states: Scheduled, Recording, Completed, Failed, Missed and Cancelled.
- Cancel active/scheduled recordings.
- Play/save completed recordings through the authenticated web app.
- Existing v0.7.2 Media Center UX remains cumulative.

## v0.8.1 — Movie & Series duration

- Uses `ffprobe` server-side to detect the real duration of Movies and Episodes before playback.
- Sends `durationSeconds` with the media playback session.
- Displays current time and total length under the player, for example `12:34 / 1:42:18`.
- Keeps the browser's own duration as a fallback when ffprobe cannot determine the source length.
- Continue Watching and resume behavior from v0.8.0 is unchanged.
- Live TV remains treated as a live stream and does not show a fixed total length.

## v0.8.2 — Continue Watching & Recently Watched fixes

- Continue Watching for IPTV Movies now stores provider + movie ID and can resume the exact movie.
- Continue Watching for IPTV Episodes now stores provider + episode ID + extension and can resume the exact episode.
- Existing unified Plex/Jellyfin Continue Watching remains supported.
- Recently Watched movie cards now open the exact movie detail instead of only navigating to Movies.
- Recently Watched episode cards retain exact playback metadata for new history entries.
- Added remove button on every Continue Watching item.
- Added Clear all for Continue Watching.
- Added remove button on every Recently Watched item.
- Added Clear all for Recently Watched.
- Legacy entries that lack enough metadata are handled gracefully and can be removed.

## v0.8.3 — Poster rails & modern scrollbars

- Continue Watching now stores and displays poster artwork for newly played Movies and Episodes.
- Recently Watched now displays poster artwork instead of text-only cards.
- IPTV episode history uses the episode poster when available and falls back to the series cover.
- Plex/Jellyfin unified playback stores poster artwork in Continue Watching and Recently Watched.
- Existing legacy entries try to reuse matching poster artwork from local history or unified libraries.
- Added polished poster cards with hover/focus effects and overlay remove buttons.
- Replaced the old browser-looking horizontal scrollbar with a thin, rounded media-center style scrollbar.
- Modern scrollbar styling applies to Continue Watching, Recently Watched and other horizontal poster rails.

## v0.8.4 — Separate Plex and Jellyfin menus

- Plex is shown as its own navigation item when at least one enabled Plex connection exists.
- Jellyfin is shown as its own navigation item when at least one enabled Jellyfin connection exists.
- The menu items are hidden automatically when no enabled connection of that type exists.
- Plex and Jellyfin each get their own Movies / Series tabs.
- Multiple servers of the same type are combined inside that source-specific view.
- IPTV Movies and IPTV Series remain separate and no longer describe themselves as mixed media-library views.
- Adding or removing a Plex/Jellyfin connection updates navigation immediately from Admin.
- Existing global Search and Home Continue/Recently Watched remain cross-source by design.

## v0.8.5 — Poster recovery

- Repairs missing artwork in Continue Watching and Recently Watched from IPTV catalogues.
- Handles legacy titles such as `SC - Series Name (2018...)` by matching them against the actual Series catalogue.
- Groups artwork repair by IPTV provider and only performs it when missing posters exist.
- Persists recovered Continue Watching posters without changing watch position or the original Updated timestamp.
- Persists recovered Recently Watched posters in local history.
- IPTV episode playback now falls back to the poster from the Series catalogue when `get_series_info` does not return a cover.
- Existing Plex/Jellyfin dedicated menus from v0.8.4 remain unchanged.

## v0.9.0 — Responsive & TV UX

This milestone introduces dedicated interaction and layout behavior for mobile, tablet, desktop and TV.

### Mobile
- Replaces the desktop sidebar with a fixed five-button bottom navigation.
- Adds a More sheet for Series, Plex, Jellyfin, Downloads, Recordings, Search, System and Admin.
- Uses two-column poster grids and swipe-friendly horizontal media rails.
- Reduces hero size and increases touch target sizes.
- Improves episode, channel, form and player layouts for narrow screens.

### Tablet
- Uses a compact icon-oriented sidebar in landscape.
- Uses bottom navigation in portrait.
- Adjusts poster density, spacing and content padding independently from mobile/desktop.
- Makes the Guide channel column sticky while horizontally scrolling the timeline.

### TV / 10-foot UI
- Adds a dedicated large-screen/coarse-pointer TV layout.
- Enlarges text, controls, posters, navigation and focus outlines.
- Improves D-pad spatial navigation and horizontal rail scrolling.
- Uses stronger focused-card scaling and scroll-to-focus behavior.
- Reduces scrollbar emphasis while keeping rails navigable.
- Improves fullscreen video sizing for televisions.

Existing IPTV, Plex/Jellyfin, DVR, duration, Continue Watching, Recently Watched and poster recovery functionality remains cumulative.


## v0.9.1 — Stabilization
- Stops desktop arrow keys from being globally hijacked unless remote navigation is actually eligible.
- Improves Mobile More-sheet close/Escape behavior and background scroll locking.
- Keeps the v0.9.0 responsive layouts cumulative.
- Adds `RELEASE-SMOKE-TEST.md` covering IPTV, Plex/Jellyfin, DVR, mobile, tablet and TV regression checks.


## v0.9.2 — Continue Watching
- Stores total duration together with Continue Watching progress.
- Shows elapsed / total time and a progress bar on each Continue Watching card.
- Does not create resume entries before five seconds of playback.
- Automatically removes an item when playback reaches about 92% or ends.
- Adds a per-item “Mark as watched” action.
- Existing remove-one and Clear all controls remain.


## v0.9.3 — Series UX
- Adds profile-specific watched state for episodes.
- Shows watched episodes with a check mark and a Replay action.
- Adds Play next unwatched to IPTV and Plex/Jellyfin series.
- Adds a Watched / Unwatch toggle per IPTV episode.
- Automatically marks an episode watched when playback ends.
- Offers the next episode after both IPTV and unified Plex/Jellyfin episode playback.


## v0.9.4 — Home redesign
- Replaces the old Quick access section with source-aware media-center cards.
- Shows Plex and Jellyfin Home shortcuts only when those connections exist.
- Prioritizes Continue Watching, Recently Added and Recently Watched.
- Adds a poster-based My favourites rail.
- Keeps media-library Movies and Series as dedicated Home rails.
- Moves official external streaming-service launchers into a collapsible secondary section.
- Uses the same responsive mobile/tablet/TV behavior introduced in v0.9.0.


## v20.2.1 — First stable milestone
v20.2.1 is the cumulative first major milestone of MyOnline TV Web.

It contains:
- IPTV Live TV, EPG Guide, Movies and Series.
- Server-side browser-compatible HLS playback.
- Movie/episode duration and resume.
- Continue Watching and Recently Watched with posters and management.
- Episode watched state and next-episode UX.
- Plex and Jellyfin as separate dynamic menu sources.
- Downloads and DVR recordings.
- Responsive mobile, tablet, desktop and TV layouts.
- D-pad/remote navigation.
- Home media-center redesign.

`RELEASE-CHECKLIST.md` is included and should be completed on the target system before declaring the installation the production baseline.


## v20.2.1 — DVR & Storage

### Live TV DVR
- Live TV channel cards now have a red **Record** button.
- The active Live TV player has a **Record** control.
- Clicking a programme in Guide opens **Play channel / Record programme** actions.
- Recordings require a configured Storage target and are no longer intended to remain permanently in the LXC.
- DVR supports a default destination and manual destination selection in the Recordings view.

### Storage destinations
Admin → **Storage** supports:
- **Mounted path / NAS** — for SMB/NFS shares mounted into the container, e.g. `/mnt/media`.
- **Cloud via rclone** — e.g. `onedrive:MyOnlineTV`, `gdrive:MyOnlineTV`, `dropbox:MyOnlineTV`, depending on the rclone remotes configured in the LXC.
- Per-target **Test**.
- Default target for **DVR**.
- Default target for **Downloads**.

The installer/updater installs `rclone`. Cloud credentials are managed by rclone itself; MyOnline TV stores only the remote destination string.

### Downloads
Movie/episode Download now asks for a destination:
- **This device** — streams the download to the browser/device. It is not kept permanently in the container.
- A configured **Storage** target — written directly to a mounted path/NAS, or transferred to an rclone cloud remote.
- Cloud/rclone transfers may use a temporary container file while the transfer is active; it is removed after successful upload.

Protected/DRM content is not decrypted or bypassed.


## v20.2.1 — Smart DVR

- Series recording rules from Guide
- New-episodes-only flag
- Configurable pre/post recording padding
- Keep-latest retention setting
- Storage target per DVR rule
- DVR rules management in Recordings


## v20.2.1 — Unified Library

- Single Library view across configured media libraries
- Title-normalized duplicate grouping
- Source chooser when the same title exists in multiple libraries
- Unified movie/series search inside Library
- Poster and source metadata retained


## v20.2.1 — Smart Home

- Profile-aware Smart Home state
- Time-aware greeting/status strip
- New for you rail
- Your favourites rail
- Direct Unified Library shortcut
- Existing Continue Watching and Recently Watched retained


## v20.2.1 — DVR Library

- Completed recordings grouped into a DVR Library
- Automatic title-based series grouping
- Channel/date/storage metadata per recording
- Direct playback for path/NAS recordings
- External-storage status for cloud recordings
- Scheduled/active recording list remains available


## v20.2.1 — Search 2.0

- One search UI across unified Movies and Series
- Live TV channel search
- DVR recording search
- Source/type labels in results
- Parallel source queries with graceful source failure


## v20.2.1 — Multi-room

- Rooms/devices registry
- TV/browser device classification
- Media handoff state API
- Last title and position per room
- Dedicated Rooms view
- Foundation for Continue on another screen


## v20.2.1 — Installable PWA

- Installable web app manifest
- Standalone display mode
- Service worker app-shell cache
- Offline shell fallback
- Maskable SVG app icon
- Theme metadata for mobile/desktop installation


## v20.2.1 — Notifications

- In-app notification center
- Read/unread state
- Browser notification permission UI
- Notification API for DVR/storage/media events
- Persistent notification history


## v20.2.1 — Appliance milestone

- Appliance health dashboard
- Disk usage/free-space status
- Configuration backup download
- Setup readiness checklist
- Storage/DVR/room status summary
- Cumulative IPTV, Plex/Jellyfin, DVR, PWA, Search and Multi-room features


## v20.2.1 — Stability & Diagnostics

- Admin diagnostics center
- FFmpeg/FFprobe/rclone checks
- Storage/provider/media-library configuration checks
- Disk free-space check
- One-click rerun
- v2.0.1 navigation hotfix retained


## v20.2.1 — DVR 2.0

- DVR status summary
- Recording conflict detection
- Scheduled/recording/completed/failed counters
- Smart DVR rule overview retained
- Storage-aware recording retained
- Conflict warning in DVR UI


## v20.2.1 — Profiles & Sync

- Server-side per-profile media-state API
- Resume position and duration fields
- Watched and favourite fields
- Poster/title/kind metadata
- Cross-device profile state view
- Local state remains compatible during migration


## v20.2.1 — EPG 2.0

- Guide promoted to EPG 2.0 UX
- Now/Next calculation helpers
- Programme progress helper
- Keyboard/TV focus improvements
- Play/record programme actions retained
- Smart DVR integration retained


## v20.2.1 — Player 2.0

- Unified Player 2 helper layer
- Resume-on-metadata support
- Audio/text track capability detection
- Fit/contain toggle
- Ended-state hook for next-episode UX
- Existing HLS/FFmpeg playback retained


## v20.2.1 — Library 2.0

- Library 2.0 presentation
- Title/year/recently-added sorting
- Facet helper foundation
- Duplicate source grouping retained
- Unified source chooser retained
- Poster metadata retained


## v20.2.1 — Downloads 2.0

- Cancel action
- Retry failed/cancelled jobs
- Device/NAS/cloud destination chooser retained
- Progress/status UI retained
- Storage destination labels
- No permanent LXC storage requirement retained


## v20.2.1 — TV Experience 2.0

- Stronger 10-foot typography
- Larger remote focus targets
- TV quick/mini guide overlay
- Guide/DVR/Search remote shortcuts
- Enhanced D-pad focus styling
- Existing spatial rail navigation retained


## v20.2.1 — Mobile / PWA 2.0

- PWA shortcuts for Live/Guide/DVR
- Install-app action
- Web Share action
- Improved mobile touch targets
- Two-column mobile poster grid
- Updated service-worker cache version


## v20.2.1 — MyOnline TV Platform

- Platform status endpoint and dashboard
- Cumulative IPTV/EPG/DVR/Storage/Plex/Jellyfin stack
- Unified Library + Search 2.0
- Server profile-state foundation
- Multi-room foundation
- Installable PWA
- Notifications and diagnostics
- Appliance backup/health retained
