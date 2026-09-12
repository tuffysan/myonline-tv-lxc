# MyOnline TV v34.0.5 — IPTV Transport Resilience

- Retries transient IPTV transport failures up to three attempts with bounded exponential backoff.
- Handles premature response termination / ResponseEnded, connection resets, timeouts, HTTP 408/425/429 and 5xx responses.
- Resilient reads for Xtream JSON, M3U playlists and XMLTV EPG.
- Persists the latest successful Live TV channel list for 24-hour fallback with stale-while-revalidate.
- Adds `/api/iptv/transport/capabilities`.
- No paid AI service or cloud AI API is required.
