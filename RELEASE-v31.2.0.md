# v31.2.0 — GitHub UI Updater

Adds a visible, secure application update flow to the MyOnline TV UI.

## User experience
- Admins see **Update vX.Y.Z available** in the header when a newer stable GitHub Release exists.
- Admin → System now contains **System Update**.
- The update page shows installed and latest GitHub versions.
- **Check again** forces a fresh GitHub check.
- **Install vX.Y.Z** queues a secure in-container update.
- The browser follows download/install/restart progress and reconnects automatically.

## Safety
UI installation is only enabled when the target release explicitly contains:
- `uiSelfUpdateCompatible: true`
- `uiUpdaterProtocolVersion: 1`

The root-owned update worker:
1. Downloads the prebuilt GitHub release.
2. Downloads and verifies `SHA256SUMS-RELEASE.txt`.
3. Validates `release.json`.
4. Rejects unsafe archive paths.
5. Creates a data backup while the app is stopped.
6. Creates a binary rollback snapshot.
7. Activates the new version.
8. Verifies `/health` and `/ready`.
9. Automatically rolls back the binaries if verification fails.

Only an authenticated Admin can queue an update. The web application itself still runs as `www-data`; it never receives unrestricted root or sudo access.
