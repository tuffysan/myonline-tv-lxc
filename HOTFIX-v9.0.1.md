# v9.0.1 — Kestrel loopback hotfix

Fixes a startup regression in v9.0.0.

v9.0.0 configured Kestrel with:

```csharp
builder.WebHost.UseUrls("http://129.0.0.1:5080");
```

The local Nginx/updater health check connects to `127.0.0.1:5080`, so the
application could not become healthy and the updater correctly rolled back.

v9.0.1 restores:

```csharp
builder.WebHost.UseUrls("http://127.0.0.1:5080");
```

A release regression check is also included so future packages fail validation
if the server is not bound to the expected loopback endpoint.
