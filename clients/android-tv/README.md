# MyOnline TV Android TV client

This directory is the v6 native-client starting point.

The native client should authenticate against the existing MyOnline TV server and consume the same source, Live, Guide, Library, DVR, profile and room APIs as the Web/PWA client.

## First implementation targets
1. Sign-in and server URL.
2. TV remote/D-pad navigation.
3. Home, Live TV and Guide.
4. Movies, Series and Library.
5. Player with native codec capability reporting and server HLS fallback.
6. DVR and Continue Watching.
7. Room handoff / remote control.

Do not embed IPTV/Plex/Jellyfin credentials in the client. Credentials remain on the MyOnline TV server.
