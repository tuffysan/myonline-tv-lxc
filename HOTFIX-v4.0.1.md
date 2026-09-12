# v4.0.1 — Compile Hotfix

Fixes the four compile errors reported by the local .NET 10 build of v4.0.0:

1. `ProviderStored.Enabled` does not exist → use configured provider presence.
2. `GetChannels()` does not exist → aggregate channels using existing `GetCachedChannels(ProviderStored)`.
3. `AppUser.IsAdmin` does not exist → use `Role == "Admin"` together with `Enabled`.
4. The same `ProviderStored.Enabled` issue in appliance readiness → use provider presence.

No feature removal is intended.
