# MyOnline TV v34.0.4 — Cleanup Release

Maintenance-only release based on v34.0.2. No intended functional changes.

## Cleanup

- Replaced obsolete `ForwardedHeadersOptions.KnownNetworks` usage with `KnownIPNetworks`.
- Removed unused local functions `ValidShareTargets`, `PlexHeaders`, `FeatureAllowed`, `ProxyArtwork`, and `BuildXtreamM3uUrl`.
- Kept the v34 no-paid-AI policy unchanged. External paid AI services are not required or supported by the runtime contract.
- Synchronized release metadata to v34.0.4.

## Quality gate

Run `VERIFY-v34.0.4.ps1`. The verifier performs static checks and, when .NET is available, requires a successful Release build with zero compiler warnings.
