# MyOnlineTV v39.13.1 — Update Backup Hardening

## Fix
The Proxmox updater could fail during step 1 when active Live TV playback changed files under `/var/lib/myonlinetv/live-hls` while `tar` was reading the persistent-data tree.

`live-hls` is transient playback state, not persistent application data, and is now excluded from pre-update backups.

## Backup retention
After a new pre-update backup has been created successfully, the updater keeps only the three newest files matching:

`/var/lib/myonlinetv/backups/pre-update-*.tar.gz`

Older matching backups are deleted automatically. Cleanup is deliberately performed after successful backup creation.

## Existing exclusions
- `backups`
- `downloads`
- `live-hls`

## Regression coverage
The .NET release gate now verifies the three backup exclusions, the three-backup retention rule, the cleanup filename scope, and that retention cleanup occurs after backup creation.

All existing Playback Engine 3.0, Live TV 2.0, IPTV Manager 2.0, Continue Watching, download, security and multi-user isolation tests remain in place.

The zero-Python build/test/release/deployment rule remains mandatory.
