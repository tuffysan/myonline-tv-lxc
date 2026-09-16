# MyOnline TV

MyOnline TV is a self-hosted TV and media platform for browsers, mobile devices and Android TV.

This README is intentionally version-independent. Release-specific history belongs in `CHANGELOG.md` and GitHub Releases.

## Main features

- Live TV / IPTV
- EPG / TV guide
- Movies
- Series, seasons and episodes
- Search
- DVR and recordings
- Profiles
- Watchlist
- Continue watching
- Multi-device and multi-room support
- Android TV client
- Apple TV client (native tvOS / SwiftUI)
- Progressive Web App
- Administration and health checks
- Backup, update and rollback support
- Proxmox / LXC deployment
- Security and production validation

## Repository structure

```text
.
├── app/                    Main ASP.NET Core application
├── clients/android-tv/     Android TV client
├── clients/apple-tv/       Apple TV / tvOS client
├── docs/                   Maintained technical documentation
├── scripts/                Install/update/operations scripts
├── install-lxc.sh
├── update-from-github.sh
├── rollback.sh
├── health-check.sh
├── PUBLISH.cmd
├── PUBLISH.ps1
├── CHANGELOG.md
└── README.md
```

## Development

The main server application is built with .NET / ASP.NET Core and C#.

The Android TV client uses Kotlin, the Android SDK and Gradle.

## Distribution workflow

GitHub Releases are the canonical distribution channel. Development happens locally; `PUBLISH.cmd` builds, authenticates, pushes `main`, creates the version tag and triggers GitHub Actions. GitHub Actions produces the verified Linux release artifact used by Proxmox.

### Publish from Windows

```powershell
.\PUBLISH.cmd
```

The first run may open GitHub in the browser for authentication. No GitHub token is stored in this repository.

## Proxmox installation

Run on the Proxmox host as root. By default the installer uses the latest stable GitHub Release, chooses the next free CTID and selects active Proxmox storage automatically.

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

Optional settings can be supplied before the command:

```bash
CTID=145 STORAGE=local-lvm MEMORY=4096 CORES=4 DISK=32 \
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

Install a specific published version:

```bash
VERSION=34.4.0 CTID=145 \
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/install-lxc.sh)"
```

## Proxmox upgrade

Upgrade CT 145 to the latest stable GitHub Release:

```bash
CTID=145 bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/update-from-github.sh)"
```

Upgrade or downgrade to a specific published release:

```bash
CTID=145 VERSION=34.4.0 \
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/update-from-github.sh)"
```

The updater downloads the release artifact, verifies its SHA-256 checksum, backs up persistent data, stages the new application, keeps a binary rollback copy, activates the release and validates both `/health` and `/ready`. A failed application health check automatically restores the previous binary version.

## Rollback and health check

```bash
CTID=145 ./rollback.sh
CTID=145 ./health-check.sh
```

## Documentation policy

The repository has one canonical README:

```text
README.md
```

Do not create version-specific README or feature files such as:

```text
README-vX.Y.Z.md
FEATURES-vX.Y.Z.md
RELEASE-vX.Y.Z.md
HOTFIX-vX.Y.Z.md
```

Use:

- `README.md` for current product documentation
- `CHANGELOG.md` for release history
- GitHub Releases for version-specific release notes
