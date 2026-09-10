# MyOnline TV v0.5.1

This release fixes the Proxmox updater failure seen during the v0.5.0 upgrade.

The application itself is unchanged from v0.5.0. The updater now handles the release archive in distinct, diagnosable stages and does not delete it until extraction has been verified.
