# v36.5.3 – Release Integrity Fix

- Includes the Mobile Live channel fix from v36.5.1.
- Includes the Tablet Live channel scoping fix from v36.5.2.
- GitHub Release publishing is now atomic from the updater's perspective: a release remains Draft until all mandatory assets are uploaded and verified as non-empty.
- Release reruns are idempotent: existing draft assets are replaced with `--clobber` before verification.
- The release is marked public/Latest only after asset verification succeeds.
- The Proxmox updater requests `/releases/latest` with no-cache headers to avoid stale latest-release responses.
