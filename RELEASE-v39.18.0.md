# MyOnlineTV v39.18.0 — Performance & Reliability

## Goal
Improve responsiveness and observability before the v40 experience migration without introducing unbounded caches or duplicate background work.

## Included
- TTL-based bounded client cache.
- Maximum cache-entry protection with oldest-entry eviction.
- In-flight request coalescing so identical concurrent work shares one request.
- Bounded chunking for large IPTV/VOD collections.
- Bounded runtime performance samples.
- Runtime diagnostics snapshot.
- `/api/health` latency probe with `cache: no-store`.
- Browser memory snapshot where the runtime exposes memory metrics.

## Reliability rules
- Cache growth is bounded.
- Runtime sample history is bounded.
- In-flight entries are always removed in `finally`.
- Health checks do not rely on cached responses.
- Errors increment diagnostics and retain the most recent error message.

## Regression policy
Every previous regression/security test remains, including Downloads 2.1, Profiles & Family 3.0, Search & Discovery 2.0, Movies & Series 3.0, Playback Engine 3.0, Live TV 2.0, IPTV Manager 2.0, Continue Watching, multi-user isolation and updater backup retention.

New v39.18.0 checks are additive.

Zero-Python build/test/release/deployment remains mandatory.

## Validation
Run:

    .\RELEASE.cmd

Do not publish v39.18.0 unless the complete release gate passes.
