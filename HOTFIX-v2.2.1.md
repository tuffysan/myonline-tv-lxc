# v2.2.1 compile fix inherited

This release train was regenerated after the v2.2.0 compile failure.

Diagnostics uses the application's existing media-library loader:

```csharp
var libs = LoadMediaLibraries();
```

The invalid `MediaLibraryConfig` reference has been removed.
