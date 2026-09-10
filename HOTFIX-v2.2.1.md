# v2.2.1 compile hotfix

The v2.1 diagnostics feature introduced a reference to `MediaLibraryConfig`, but the application model is named `MediaLibraryProvider` and the established loader is `LoadMediaLibraries()`.

Fix:
```csharp
var libs = LoadMediaLibraries();
```

This removes CS0246 while preserving the diagnostics check for enabled Plex/Jellyfin libraries.
