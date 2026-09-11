# v28.0.0 — Fast Home

Root cause:
Home previously waited for several expensive operations before rendering:
- `/api/unified/movies` — up to 65 seconds
- `/api/unified/series` — up to 65 seconds
- channels + EPG
- missing-poster recovery
- poster recovery can enumerate full IPTV VOD/Series catalogues and had timeouts up to 125 seconds

Changes:
- Home now paints quickly using local/session-cached content.
- Continue Watching uses a short 5-second, single-attempt request.
- Unified Movies/Series load in the background.
- Live channels and EPG load in parallel in the background.
- Home data is cached in `sessionStorage` for five minutes.
- EPG lookup builds a channel index instead of filtering the entire EPG list once for every channel.
- Expensive legacy poster repair no longer blocks Home.
- Slow background results are ignored if the user has already left Home.
- Loading placeholders are shown while deferred sections refresh.

No paid service, cloud cache or external API was introduced.
