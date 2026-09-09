# MyOnline TV Web v0.3.4 — Proxmox LXC

MyOnline TV Web is a self-hosted entertainment appliance for Proxmox VE.

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

v0.3.4 detects the Proxmox host architecture before creating the container:

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


## v0.3.4 installation verification

The installer now verifies the full request path, not only the ASP.NET backend:

```text
Browser/Nginx :80 -> MyOnline TV :5080
```

Before reporting a successful installation it checks `/health` and `/ready` through both port `5080` and Nginx port `80`. It also fails if the standard Nginx welcome page is still active.

## Update

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/update-from-github.sh)"
```

Before activating a new version, v0.3.4 creates:

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

v0.3.4 exposes:

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
myonline-tv-web-v0.3.4-linux-x64.tar.gz
myonline-tv-lxc-v0.3.4-source.tar.gz
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
