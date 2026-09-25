# Multi-user isolation audit and release readiness

Inspection: 2026-09-24. Release candidate: **39.8.4**. **Not ready for release.**

## Preserved repository history

HEAD remains `34a110e` (`WIP: preserve current unreleased changes`). No reset,
revert, discard, commit, push, tag creation/move/deletion or release was performed.
All changes below remain in the working tree on top of that WIP commit.

The established baseline is `v39.8.3` (`9aabf13`). The subsequent `v37.1.0`
(`aae0972`) is an anomaly: GitHub published it at 2026-09-18 20:55 UTC,
after v39.8.3 at 15:02 UTC. Local and remote tags and all 61 GitHub release/draft
records were inspected. No v39.8.4 exists. The later explicit `build` request
authorized preparation of 39.8.4; publication remains gated by the blockers below.

## Findings and fixes

| Area | Finding | Change |
| --- | --- | --- |
| Continue Watching / favourites | Profile-only files and shared legacy fallbacks could expose another account's state; admin bypass exposed arbitrary profile state. | Account-ID plus profile file keys; verify profile access; only the original account may read unattributed legacy state. Its ID is pinned in SQLite metadata. |
| Remove / clear | Removal must be durable and independent of favourites or media. | Preserve the WIP backend deletes, persist empty lists, serialize progress operations, and retain menu/confirmation UI across all layouts. Playback can add progress again. |
| Profile media state | Global file read without account partition. | Per-account persisted state with owned-profile-only legacy migration. Personal profiles are filtered; separate admin profile metadata endpoint preserves administrative editing. |
| Admin diagnostics | Several legacy admin capability/overview routes lacked authentication and exposed server metadata. | Require an authenticated administrator for the entire /api/admin namespace, including mixed-case routes. |
| PIN response | Personal policy responses included password credential material. | Return hasPin and policy flags only; PIN verification checks profile access. |
| Tokens / downloads | Proxy/media tokens, download lists and mutations lacked account ownership. | Stable account-ID ownership checks on reads, playback, download creation/file/delete/cancel/retry, including mixed-case API paths. No-store headers prevent shared API caching. |
| Download filenames | Shared storage filenames could collide; non-ASCII header values crash Kestrel. | Unique job ID in local/remote destination names; retain the WIP ContentDispositionHeaderValue.SetHttpFileName implementation for ASCII fallback plus RFC-compatible UTF-8 filename*. Framework file downloads retain their built-in encoding/range handling. |
| Playback | Starting a stream stopped every user's session; session resources lacked owner checks. | Stop only the caller's sessions; verify ownership of status, HLS files and deletion. FindExecutable handles Windows .exe suffixes for local validation. |
| Providers / media libraries | Source-specific guards had gaps and literal metadata routes could be mistaken for provider IDs. Reused deleted IDs could reconnect to old caches/DVR state. | Enforce source ownership before source-specific routes; reject foreign/nonexistent IDs and only generate new source IDs server-side. Preserve legitimate provider credential encryption and owner-only edit views. |
| DVR | Recordings/rules could be listed or mutated across users; request-body provider IDs were not verified. | Filter lists/conflicts/upcoming/status by provider ownership; validate provider ownership on creation and ownership on recording/rule mutations and file access. |
| Rooms / notifications | Global lists and mutations exposed other users' devices, active titles and notices. | Account-specific persisted files and owner-scoped mutation/read paths. Personal status counts are scoped too. |
| Browser state | Home/catalogue/memory caches, history, favourites, watchlist and other keys were shared across logins. | Account/profile cache keys, account-aware browser history, stale-response rejection, reload at logout/account change, and cross-tab account-change notification. Ambiguous unscoped browser data is preserved on disk but not imported into another account. |
| Account lifecycle | Deleted/disabled/recreated accounts could retain valid cookies or inherit username-owned sources; SQLite retained a conflicting username. | Cookies carry immutable account ID and are revalidated; invalid sessions can still reach the login/status flow. Rename source ownership with accounts, quarantine deleted owners, preserve the old SQLite ID under a retired name, and never attach old tokens/progress to a recreated account. |
| Release process | Nearest tag/version metadata regressed to 37.x; publisher could delete/replace tags. | Prepare VERSION/release.json 39.8.4, restore assembly-derived product metadata, add numeric baseline/collision guards and immutable tag checks to the existing publisher/workflow. Document policy in AGENTS.md and RELEASE.md. |

Existing Continue Watching removal never deletes library records, episodes,
movies or media files and does not remove favourites/watchlist membership.
Legacy files are retained. Existing cookies lacking an account-ID claim require
one fresh login after upgrade. Download jobs/tokens remain in-memory, as before;
this audit does not claim download queue persistence across restarts.

## Verification performed

- Release web build: passed, zero warnings/errors on the completed build.
- Standard publish and linux-x64 framework-dependent cross-publish: passed.
  Required DLL/runtime configuration and index/app/mobile/Continue Watching
  web assets verified non-empty. Cross-publish is not a Linux runtime test.
- `tests/DownloadHeaders`: passed 14 Unicode/control/punctuation filename cases
  over real Kestrel HTTP plus a range request.
- `tests/continue_api.py`: passed movie/episode removal, repeat deletion, profile
  rejection, login and application restart, clear, rewatch, concurrent saves,
  favourite state and physical media preservation.
- `tests/security_isolation.py`: passed real separate-account Kestrel tests with
  temporary data and a local fake upstream: foreign profiles, provider/credential
  and cache routes, mixed-case routes, tokens/download ownership, Unicode device
  download, same-title download collision, DVR/rules, rooms/notifications,
  media-library playback/episode access, separate FFmpeg session ownership, and
  account deletion/recreation, disabled-session rejection and admin-route authorization. The FFmpeg fixture is deliberately invalid media:
  it proves session ownership/lifecycle, not successful real-provider playback.
- Headless Edge mobile suite: passed desktop/phone/tablet/TV Continue Watching
  removal and clear confirmation, navigation/detail history, filters, guide,
  live favourites, collections, responsive player/overflow and user cache keys.
  Browser APIs are mocked; live IPTV/device playback remains a runtime gate.
- `tests/release_version.Tests.ps1`: passed anomaly, numeric ordering, canonical
  and legacy tag collisions, higher release and skipped-patch rejection.
  The guard also passed against the real GitHub release/draft history.
- JavaScript syntax, PowerShell publisher parsing, architecture validation,
  architecture gate, loopback-binding check, metadata consistency and
  `git diff --check`: passed.
- Deployment gate / install-update bootstrap integration: passed after fixing
  the test fixture to emit text-mode checksums and accept the updater's
  cache-busting latest-release query. No production deployment was run.
- CI workflows were updated to run the new isolation/version checks. No new
  GitHub Actions run or published release artifacts exist for this candidate.

## Remaining release validation / blockers

The source-level blockers identified during the earlier audit were rechecked against
the current 39.8.4 working tree:

- `scripts/PRODUCTION-GATE-v30.ps1` has been reconciled. It now composes the
  maintained architecture and release-version gates and no longer references the
  missing historical `VERIFY-v31.2.0.ps1`.
- A route-level comparison against `v39.8.3` found **no missing Minimal API routes**
  in the current `app/Program.cs`. The previously reported provider adult-groups,
  refresh-live-preview, sync-history, sync-diagnostics and catalogue-preferences
  bulk routes are present again. The current tree adds `/api/admin/profiles`.
- Temporary `.restore-*` recovery artifacts were removed from the release candidate.
- `git diff --check` whitespace issue at the end of `styles.css` was corrected.

The following environment/runtime validation is still required before production
publication and must not be represented as completed by this review:

1. Android TV preflight/build requires a suitable Java/JDK/Gradle environment and
   device/emulator validation.
2. Apple TV build requires macOS/Xcode/XcodeGen and device/simulator validation.
3. A target LXC is still required for clean install/upgrade, real IPTV/Plex/Jellyfin
   playback, DVR file playback, backup/restore and long-running playback tests.
4. The broader `SECURITY-GATE-v29.6.0.md` production sign-off, including deployment
   cookie/proxy configuration, rate limiting and audit logging, remains a production
   validation item.

These native-client and target-environment checks are release gates if those targets
are part of the intended 39.8.4 production sign-off. They do not indicate a known
cross-user isolation failure in the reviewed web code. No exercised multi-user
isolation test is documented as failing.

## All changes relative to v39.8.3

This comparison includes aae0972 (already published under the anomalous
v37.1.0 tag), the preserved unreleased WIP 34a110e, and the current working tree.
It is not accurate to label all of aae0972 as never published; all subsequent
work and the 39.8.4 candidate remain unreleased.

The combined changes comprise mobile redesign and responsive navigation/player/
guide/collection work; Continue Watching removal/clear; Unicode headers;
security isolation and account lifecycle fixes; tests and CI/publisher changes;
version policy and corrected product metadata; release-upload resilience;
historical release documents and changelog changes; and the unresolved
functionality removals listed above. Native client packaging versions are
independent and were not blindly changed to the web product version.

Complete tracked/untracked file inventory relative to v39.8.3:

- `.github/workflows/release.yml`
- `.github/workflows/validate.yml`
- `.gitignore`
- `AGENTS.md`
- `CHANGELOG.md`
- `MULTI-USER-AUDIT.md`
- `PUBLISH.ps1`
- `RELEASE-FILES-v39.8.3.txt`
- `RELEASE-v37.0.2.md`
- `RELEASE-v37.1.0.md`
- `RELEASE.md`
- `VERSION`
- `app/DownloadHeaders.cs`
- `app/Program.cs`
- `app/wwwroot/app.js`
- `app/wwwroot/continue-watching.js`
- `app/wwwroot/index.html`
- `app/wwwroot/mobile.css`
- `app/wwwroot/mobile.js`
- `app/wwwroot/styles.css`
- `app/wwwroot/sw.js`
- `release.json`
- `scripts/Release-VersionGuard.ps1`
- `scripts/TEST-DEPLOYMENT-BOOTSTRAP.sh`
- `tests/DownloadHeaders/DownloadHeaders.csproj`
- `tests/DownloadHeaders/Program.cs`
- `tests/continue_api.py`
- `tests/mobile/README.md`
- `tests/mobile/mobile.test.cjs`
- `tests/mobile/package.json`
- `tests/release_version.Tests.ps1`
- `tests/security_isolation.py`

## Current Git status

```text
 M .github/workflows/release.yml
 M .github/workflows/validate.yml
 M AGENTS.md
 M CHANGELOG.md
 M PUBLISH.ps1
 M VERSION
 M app/AdvancedTvV2500.cs
 M app/AndroidTvV2410.cs
 M app/ArchitectureV28V2800.cs
 M app/CinemaScreensaverV2690.cs
 M app/FamilyGuestV2680.cs
 M app/FeatureCompletionCatalog.cs
 M app/LiveTv4V2330.cs
 M app/MediaIndexV2320.cs
 M app/MultiDeviceV2400.cs
 M app/NotificationCenterV2620.cs
 M app/PersonalHomeV2380.cs
 M app/PlaybackEngine2V2350.cs
 M app/PlaybackResilienceV2360.cs
 M app/Profiles2V2370.cs
 M app/Program.cs
 M app/RemotePairingV2420.cs
 M app/RoomsHandoffV2430.cs
 M app/RuntimeMetricsV2310.cs
 M app/SelfHealingV2700.cs
 M app/SmartCollectionsV2660.cs
 M app/SmartEpgV2630.cs
 M app/SportsHubV2670.cs
 M app/StreamDoctorV2610.cs
 M app/UnifiedLibrary4V2340.cs
 M app/UnifiedWatchlistV2650.cs
 M app/UniversalSearchV2390.cs
 M app/WhatsOnTonightV2640.cs
 M app/wwwroot/app.js
 M app/wwwroot/mobile.js
 M release.json
 M scripts/TEST-DEPLOYMENT-BOOTSTRAP.sh
 M tests/continue_api.py
 M tests/mobile/mobile.test.cjs
?? MULTI-USER-AUDIT.md
?? RELEASE.md
?? scripts/Release-VersionGuard.ps1
?? tests/release_version.Tests.ps1
?? tests/security_isolation.py
```
