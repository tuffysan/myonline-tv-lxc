# v6.2.0 — Android TV Native UI

- Fixes Android TV login to use the server's real JSON `/api/auth/login` contract.
- Adds native Android TV browsing for Live TV, Guide, Movies and Series.
- Reads the configured provider list from `/api/providers` and selects an IPTV/Xtream source.
- Adds channel browsing through `/api/channels/{providerId}`.
- Adds EPG browsing through `/api/epg/{providerId}`.
- Adds VOD browsing through `/api/vod/{providerId}/items`.
- Adds Series browsing and episode lists through `/api/series/...`.
- Adds actual Live playback startup/polling using `/api/live/start/...` and `/api/live/status/...`.
- Adds movie/episode playback using server-issued proxy tokens.
- Uses native Media3/ExoPlayer for playback.
- Adds RecyclerView/D-pad friendly native list screens.
- Provider credentials remain exclusively on the MyOnline TV server.

## Current limitation
The Android project is statically validated here, but an Android SDK/Gradle build is still required on a machine with Android Studio/SDK before calling the APK production-ready.
