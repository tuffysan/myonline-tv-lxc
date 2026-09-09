# Architecture — v0.2.0

```text
Browser / TV / Phone / Tablet
          |
          | HTTP(S)
          v
        Nginx
          |
          v
ASP.NET Core MyOnline TV Web
  |       |        |       |
  |       |        |       +-- Authenticated media/artwork proxy
  |       |        +---------- Downloads / FFmpeg
  |       +------------------- XMLTV + Xtream APIs
  +--------------------------- M3U providers
          |
          v
 /var/lib/myonlinetv
  - admin password hash
  - AES-GCM key
  - encrypted provider connections
  - favourites / continue watching
  - downloaded media
```

The frontend never needs the Xtream password or the original live/VOD/series stream URL. The backend exchanges provider URLs for short-lived in-memory proxy tokens.

hls.js requests the local proxy URL. If the upstream response is an unencrypted HLS playlist, the server rewrites its child playlist/segment URIs into additional local proxy tokens.

Commercial DRM is intentionally outside this architecture.
