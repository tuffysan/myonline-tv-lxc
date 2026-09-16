# MyOnline TV v34.4.0 — Distribution Edition

This release makes GitHub Releases the canonical distribution channel for Proxmox LXC.

- One-command installation from the latest stable GitHub Release.
- One-command upgrade with persistent-data backup, checksum verification, health/readiness checks and automatic binary rollback.
- `VERSION=x.y.z` can pin an installation or upgrade to a specific release.
- New installations automatically choose the next available CTID when CTID is omitted.
- New installations automatically select an active Proxmox rootdir-capable storage when STORAGE is omitted.
- Stable installs fail clearly when no GitHub Release exists instead of silently building an unpublished `main` branch.
- Release metadata and Linux artifact names are synchronized with v34.4.0.

## Publish hotfix
- GitHub CLI auth status is now checked through `cmd.exe` so Windows PowerShell does not turn `gh auth status` stderr output into a terminating `NativeCommandError`.
