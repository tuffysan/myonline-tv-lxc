# MyOnline TV v38.0.0 — Core Consolidation

This release consolidates product/version identity without removing existing streaming features.

## Changes
- `VERSION` is the source for the .NET assembly version.
- Active capability APIs now report the current runtime version through `AppIdentity`.
- GitHub updater and outbound app User-Agent values use the current runtime version.
- Old v31.2.0 labels were removed from active UI surfaces.
- Service-worker cache moved to `myonline-tv-v38.0.0`.
- CI checks release metadata and blocks known stale runtime identity literals.
- GitHub Release workflow retains resilient draft-release normalization from v37.0.2.

## Upgrade
Use the normal MyOnline TV GitHub/LXC updater. Existing data schema remains version 3.
