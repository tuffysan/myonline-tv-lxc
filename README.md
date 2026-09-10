# MyOnline TV Web v0.5.5 — Proxmox LXC

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
  -> ASP.NET Core 127.0.0.1:5080
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

The application also binds only to `127.0.0.1:5080`; Nginx remains the public entry point on port 80.

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


## Live TV browser playback (v0.5.5)

Raw MPEG-TS/`video/mp2t` Live TV streams are now converted to browser-compatible HLS by FFmpeg inside the LXC. The default path uses stream-copy remuxing (`-c copy`) for low CPU use. If hls.js reports a fatal codec/playback failure, the web UI retries once with H.264/AAC compatibility transcoding. Switching channel stops the previous FFmpeg session and removes temporary HLS segments. Provider source URLs and credentials remain server-side.

### Live TV channel cache and startup flow

v0.5.5 caches each provider's Live TV channel metadata for 10 minutes. Once a cache exists, stale data is returned immediately while refresh runs in the background. Artwork proxying is lazy, which avoids generating tens of thousands of proxy entries during a channel refresh. Live TV playback no longer uses a temporary in-memory playback token: the browser sends the provider ID and channel key to the server, which resolves the protected source URL from the server-side channel cache. FFmpeg startup remains asynchronous: the browser starts a session and polls its status until HLS is ready, so a slow stream cannot hold an Nginx request open until a gateway timeout.

## Release naming

For v0.5.5 and later, the preferred Git tag format is:

```text
v0.5.5
```

The release workflow also accepts the legacy form `v.0.5.5`, and the updater normalizes both forms when locating release artifacts.

A successful GitHub Release must contain these generated assets in addition to GitHub's automatic source archives:

```text
myonline-tv-web-v0.5.5-linux-x64.tar.gz
myonline-tv-lxc-v0.5.5-source.tar.gz
SHA256SUMS-RELEASE.txt
release.json
```

If only `Source code (zip)` and `Source code (tar.gz)` are shown, the Release workflow did not finish successfully and the Proxmox updater should not be run yet.

## Stable baseline: v0.5.5

v0.5.5 deliberately uses the last user-confirmed working application baseline (v0.4.6) for Live TV, Guide, Movies and Series, while retaining the corrected GitHub release/update infrastructure.

Create the release tag as:

```text
v0.5.5
```

A successful GitHub Release must contain:

```text
myonline-tv-web-v0.5.5-linux-x64.tar.gz
myonline-tv-lxc-v0.5.5-source.tar.gz
SHA256SUMS-RELEASE.txt
release.json
```

## v0.5.5 updater correction

v0.5.5 fixes a false "required asset is missing" error in `scripts/github-common.sh`.
The updater now treats a successful `curl` as success, verifies that the file is non-empty,
downloads `SHA256SUMS-RELEASE.txt`, and validates the release archive checksum before installation.
