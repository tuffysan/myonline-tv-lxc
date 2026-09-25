# MyOnlineTV v39.13.0 — Playback Engine 3.0

## Scope
Playback Engine 3.0 introduces a common playback contract for the main playback entry points.

### Included
- Central `playbackEngine(request)` contract.
- Continue Watching routed through the common engine.
- Unified Movies / Series / Episodes routing.
- Live TV routing with the existing recovery/transcode fallback.
- Direct URL and downloaded-media routing.
- Server-token playback routing.
- Resume position carried through the common request.
- Playback diagnostics on engine failures.
- Existing v39.12.0 Live TV 2.0 behavior retained.

## Release quality rules
- All existing regression tests remain in the release gate.
- New Playback Engine 3.0 regression tests are additive.
- Multi-user isolation remains mandatory.
- Build/test/release/deployment remains Python-free.

## Validation
Run on Windows:

    .\RELEASE.cmd

Do not publish the release unless the complete gate passes.
