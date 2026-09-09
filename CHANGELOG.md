# Changelog

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
