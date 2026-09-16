# v31.2.0 Production Gate

A feature is not considered production-verified until it passes:
1. .NET 10 publish.
2. Upgrade from the previous published release.
3. Service restart and persistence.
4. Real IPTV live/VOD playback.
5. Real Plex playback.
6. Real Jellyfin playback.
7. Browser and TV/remote navigation.
8. Per-user source isolation using at least two users.

Static validation alone does not satisfy this gate.
