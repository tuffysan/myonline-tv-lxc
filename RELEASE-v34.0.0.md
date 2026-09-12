# MyOnline TV v34.0.0 — Advanced Features

## Goal
Build advanced discovery, multi-device and appliance capabilities on the stable v32/v33 foundation.

## Included
- Advanced-feature capability contract.
- Unified discovery/search/smart-collection declaration.
- Multi-room, handoff, remote-control and synchronized-resume declaration.
- Self-healing, backup/restore, diagnostics and update-safety declaration.
- Local-first/no-mandatory-cloud operating principle.
- Client-side platform snapshot helper for capability-driven UI work.

## Definition of Done
1. Search/discovery uses existing unified media contracts.
2. Handoff and room functionality never bypasses authorization.
3. Resume state remains profile-aware.
4. Operations/self-healing does not hide permanent errors.
5. Upgrade and rollback remain safe.

## Verification
Run `scripts/VERIFY-v34.0.0.ps1`, then exercise search, rooms/handoff, backup and update-health flows.
