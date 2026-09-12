# MyOnline TV v34.0.4 — Cleanup Release

This release continues the warning-free cleanup from v34.0.3.

## Changes
- Removed unused local helper `SameAccount`.
- Removed unused local helper `ProfileAllowedForUser`.
- Retains the `KnownIPNetworks` .NET 10 cleanup.
- Retains the no-paid-AI runtime policy.
- Synchronizes runtime/API/UI version reporting to 34.0.4.
- `VERIFY-v34.0.4.ps1` requires a successful Release build with zero compiler warnings.

No intentional functional behavior changes are included.
