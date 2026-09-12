# v3.0.1 compile hotfix

The Profile Sync endpoints introduced in the v2.3.x roadmap use `profileStateFile`, but the path declaration was missing in Program.cs.

Added:

```csharp
var profileStateFile = Path.Combine(dataDir, "profile-state.json");
```

Also verified:
- Diagnostics uses `LoadMediaLibraries()`; no `MediaLibraryConfig` reference remains.
- Appliance / Alerts / Rooms / Library view dispatch mappings remain present.
