# v6.0.0 release checklist

- Run `PUBLISH.cmd` with .NET 10 SDK and require a clean build.
- Test upgrade from the last confirmed production version.
- Test Home, Live, Guide, Movies, Series, Library, DVR, Search and Admin.
- Test IPTV/Plex/Jellyfin source access for Admin-managed and user-managed modes.
- Test playback and resume in browser/PWA.
- Verify backup before production update.
- Treat `clients/android-tv` as the native-client starting contract; it does not replace the server.
