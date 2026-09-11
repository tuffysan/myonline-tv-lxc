# v30.0.2 — Update Safety Hotfix

This patch hardens the Proxmox/LXC updater.

## Changes
- Final verification now checks:
  - `myonlinetv` service
  - nginx service
  - backend `/health`
  - backend `/ready`
  - nginx-proxied `/health`
- Startup settling is retried for up to ~15 seconds without printing harmless transient connection-refused messages.
- A failed final verification can no longer reach `Update verified`.
- Final verification failure activates the binary rollback snapshot.
- The restored backend is health-checked after rollback.
- The persistent pre-update data backup is retained.
- Clear critical diagnostics are printed if rollback itself does not become healthy.

This patch introduces no mandatory external service or recurring runtime cost.
