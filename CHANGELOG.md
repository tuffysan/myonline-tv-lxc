# Changelog

## v0.4.15 — updater download fix
- Fixes the updater bug that reported a release asset as missing immediately after a successful download.
- Replaces the incorrect `if ! curl ... || { ... }` construct with a normal `if ! curl; then ... fi`.
- Verifies the downloaded application archive and checksum file with `test -s` semantics.
- Verifies that `SHA256SUMS-RELEASE.txt` actually contains the expected application artifact before running `sha256sum -c`.
- Moves the `github-common.sh` shebang back to the first line.
- Keeps the stable v0.4.14 application and corrected linux-x64 GitHub release workflow unchanged.

## v0.4.15 — Stable release workflow fix
- Keeps the user-confirmed v0.4.6 application baseline used by v0.4.13.
- Fixes GitHub Actions NETSDK1047 during Publish linux-x64.
- Adds an explicit runtime-specific `dotnet restore app/MyOnlineTV.Web.csproj -r linux-x64` before publish.
- Keeps `dotnet publish -r linux-x64 --self-contained false --no-restore` after the matching restore.
- Keeps release asset verification and GitHub Release publishing.

## v0.4.15 — Stable recovery build
- Restores the last user-confirmed working application baseline from v0.4.6.
- Live TV playback retained from the proven FFmpeg/HLS implementation.
- Movies playback retained from the proven v0.4.5/v0.4.6 implementation.
- Series playback retained from the proven v0.4.5/v0.4.6 implementation.
- Guide retains one-click direct playback from v0.4.6.
- Excludes the later v0.4.7+ catalogue pagination/history/cleanup changes that introduced regressions or build failures.
- Uses the corrected GitHub Release workflow and updater infrastructure from the later release-fix work.
- Intended as the new stable baseline before adding further features.

## v0.4.15
- Guide programmes now start Live TV immediately when clicked.
- Removed the old flow that scrolled to a programme details card at the bottom of the Guide and required a second Watch Live click.
- Playback uses the existing Guide player area above the timeline.
- Channel-row Live buttons continue to work unchanged.
- Keeps all v0.4.5 Movies/Series FFmpeg-HLS playback fixes and v0.4.4 release fixes.

## v0.4.15
- Fixes Movies and Series playback in browsers.
- Identified raw MKV/TS/provider media as the playback problem: browsers cannot reliably play these containers/codecs through a simple HTTP proxy.
- Movies and episodes now start server-side FFmpeg HLS playback, like the proven Live TV pipeline.
- Playback first attempts stream-copy/remux for low CPU use.
- If hls.js reports an incompatible codec, the player automatically retries with H.264/AAC transcoding.
- Provider media URLs remain server-side and are resolved through short-lived media tokens.
- Download handling remains separate and unchanged.
- Keeps v0.4.4 release/tag compatibility and all Live TV/catalogue fixes.

## v0.4.15
- Includes the v0.4.3 Movies/Series lazy-token and catalogue scalability fixes.
- Fixes GitHub Release packaging so artifact filenames are no longer hard-coded to one version.
- Release workflow accepts preferred `v0.4.15` tags and legacy-compatible `v.0.4.15` tags.
- Updater normalizes both tag formats to the canonical artifact name `myonline-tv-web-v0.4.15-linux-x64.tar.gz`.
- Updater now gives a clear error when a GitHub Release exists without built artifacts.
- README documents how to verify a successful release before updating Proxmox.

## v0.4.15
- Fixes the Movies/Series catalogue scalability regression identified from v0.4.2 runtime logs.
- Catalogue endpoints no longer create thousands of proxy/download tokens while loading every movie/episode.
- Movie playback/download tokens are now created lazily only when Play/Download is clicked.
- Series episode playback/download tokens are now created lazily only when an episode is clicked.
- Keeps Xtream catalogue caching and the v0.4.1 Live TV fix.
- Reduces memory/CPU pressure caused by very large IPTV VOD catalogues.

## v0.4.15
- Movies/Series reliability hotfix.
- Added 10-minute Xtream catalogue caches for VOD and Series categories/items.
- Bounded catalogue requests so a slow provider does not leave the UI loading indefinitely.
- Improved invalid/empty Xtream response diagnostics and returns 502 with sanitized provider errors.
- Movies and Series now show load failures inside their grids instead of appearing stuck.
- Preserves the v0.4.1 Live TV regression fix.

## v0.4.15
- Critical Live TV regression fix.
- Removed an accidental Continue Watching block from `playLive()` that referenced undefined `mediaId`, `video` and `url` variables and stopped Live TV before `/api/live/start` was called.
- Moved Continue Watching tracking into `playMedia()` where those variables belong.
- Keeps the v0.3.16 working FFmpeg/HLS Live TV start/status/playback flow.
- Keeps v0.4.0 Guide, channel/group visibility, profiles and system features.

## v0.4.15
- Viewer profiles with profile picker and Settings management.
- System dashboard shows active streams, profiles and app memory.
- Backup now includes channel preferences and profiles.
- Restore provider/channel/profile/viewing data from a server backup.
- Includes all Guide, channel management and Movies/Series improvements from v0.3.18–v0.3.20.

## v0.4.15
- Poster-first Movies and Series presentation.
- Movie details with plot, genre, year and rating when provided by Xtream.
- Richer Series cards.
- Continue Watching progress is saved during movie/episode playback.
- Home page now has a Continue Watching rail.

## v0.4.15
- Guide windows for Now, Tonight and Tomorrow.
- Red current-time line and current-program highlighting.
- Programme details with Watch live action.
- Live player stays available above the guide while browsing EPG.

## v0.4.15
- Start Live TV directly from channel rows and programme blocks in Guide.
- Hide whole groups or individual channels.
- Server-side channel/group preferences shared across devices.
- Local channel aliases.
- Settings page for managing and restoring hidden groups/channels.

## v0.4.15
- Live TV UX release.
- Added Now/Next EPG information to channel cards and player overlay.
- Added LIVE overlay with channel logo and clock.
- Added Favourites and Recently watched channel groups.
- Added previous/next channel controls.
- Added fullscreen control.
- Added keyboard/remote navigation: arrows, Enter and F.
- Added clearer Connecting / Preparing / Playing / Error playback states.
- Kept the working v0.3.16 FFmpeg/HLS playback architecture unchanged.

## v0.4.15
- Release re-spin of v0.3.15 so a clean GitHub Release can be created.
- Same Live TV direct provider/channel playback flow as v0.3.15.
- Version and release metadata updated to 0.4.15.

## v0.4.15
- Fixed Live TV playback start by removing the temporary in-memory live proxy token hop.
- `/api/live/start/{providerId}/{channelKey}` now resolves the channel directly from the server-side provider cache and starts FFmpeg from its protected source URL.
- Fixed TV Guide playback to pass the channel key instead of the removed `playToken` field.
- Keeps provider credentials and source stream URLs server-side.
- Preserves asynchronous FFmpeg/HLS startup and compatibility-transcoding fallback from v0.3.14.

## v0.4.15

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
