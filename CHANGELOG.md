# Changelog

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
