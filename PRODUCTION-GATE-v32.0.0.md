# v32.0.0 Production Gate

Do not mark v32.0.0 production-verified until all are green:

- `PUBLISH.cmd` succeeds on .NET 10.
- Upgrade from the latest published v31.x succeeds and rollback is tested.
- Restart preserves SQLite data and encrypted source credentials.
- Two different users cannot enumerate or play each other's IPTV/Plex/Jellyfin sources.
- Source Doctor succeeds/fails correctly against real services.
- Real IPTV Live and VOD playback tested.
- Real Plex playback tested.
- Real Jellyfin playback tested.
- EPG aliases survive restart.
- Search/Home return only the authenticated user's media.
- TV remote/D-pad navigation tested on actual hardware.
- No mandatory paid cloud/runtime dependency.
