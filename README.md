# MyOnline TV Web v0.2.0 — Proxmox LXC

Self-hosted MyOnline TV Web for Proxmox VE.

## One-line installation

Run on the **Proxmox host** as root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

Default deployment:

- CTID `145`
- hostname `myonlinetv`
- 2 CPU cores
- 2048 MB RAM
- 16 GB disk
- DHCP
- `local-lvm`
- `vmbr0`

After installation the script prints the URL, for example:

```text
http://192.168.1.75/
```

Open it and create the administrator account.

## Update from GitHub

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/update-from-github.sh)"
```

The updater:

1. resolves the latest stable GitHub Release;
2. compares it with the installed version;
3. downloads the repository;
4. builds the new ASP.NET Core application inside the LXC;
5. creates a rollback snapshot;
6. activates the new version;
7. runs an API health check;
8. automatically rolls back if the health check fails.

Use `FORCE=1` to reinstall the same version.

## Health check

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/health-check.sh)"
```

Or after cloning the repository:

```bash
CTID=145 ./health-check.sh
```

## Rollback

```bash
CTID=145 ./rollback.sh
```

The updater retains the previous published application as `/opt/myonlinetv/publish.rollback`.

Persistent application data under `/var/lib/myonlinetv` is not replaced during application rollback.

## Uninstall

Clone/download the repository and run:

```bash
CTID=145 ./uninstall-lxc.sh
```

A destructive confirmation phrase is required before the container is removed.

## Custom installation

```bash
CTID=150 \
MEMORY=4096 \
CORES=4 \
DISK=32 \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

Static IP:

```bash
CTID=150 \
IP_CONFIG='ip=192.168.1.50/24,gw=192.168.1.1' \
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

## Stable vs main

The default is:

```text
MYONLINE_CHANNEL=stable
```

When a GitHub Release exists, installation/update uses the latest release. If no release exists yet it falls back to `main`.

Use current `main` explicitly:

```bash
MYONLINE_CHANNEL=main bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

Use a specific version:

```bash
MYONLINE_REF=v0.2.0 bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

## v0.2.0 features

- administrator setup/login;
- PBKDF2-SHA256 password hashing;
- AES-256-GCM encrypted IPTV provider connections;
- migration from v0.1.0 plaintext provider storage;
- authenticated provider/media proxy;
- M3U Live TV;
- XMLTV timeline EPG;
- Xtream-compatible Movies and Series;
- artwork/posters;
- hls.js playback;
- favourites;
- Continue Watching storage;
- server-side video downloads;
- FFmpeg support for authorized non-encrypted HLS;
- responsive TV/tablet/mobile UI.

MyOnline TV does not bypass DRM or protected streaming-service download restrictions.

## Persistent data

```text
/var/lib/myonlinetv/
├── version
├── admin.json
├── secrets.key
├── providers.json
├── favourites.json
├── continue-watching.json
└── downloads/
```

Back up `providers.json` and `secrets.key` together.

## GitHub Actions

Two workflows are included:

- **Validate** — checks Bash/JavaScript, builds and publishes the .NET application.
- **Release** — triggers on `v*` tags, checks the tag against `VERSION`, builds the application and creates the GitHub Release.

See:

- `docs/GITHUB-SETUP.md`
- `docs/RELEASE-PROCESS.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY.md`

## Security

The default Nginx listener is HTTP for LAN use. Do **not** directly expose it to the public Internet.

For remote access use HTTPS and preferably Tailscale/VPN or another properly secured reverse proxy.
