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

## Installation

```bash
git clone https://github.com/tuffysan/myonline-tv-lxc.git
cd myonline-tv-lxc
chmod +x install-lxc.sh update-from-github.sh rollback.sh health-check.sh
chmod +x scripts/*.sh
./install-lxc.sh
```

## Updating

```bash
./update-from-github.sh
```

## Rollback

```bash
./rollback.sh
```

## Health check

```bash
./health-check.sh
```

## Windows publishing

```powershell
PUBLISH.cmd
```

or:

```powershell
.\PUBLISH.ps1
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
