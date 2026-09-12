# MyOnline TV v32.0.0 — Playback & Stability

## Goal
Make Live TV, Movies and Series reliable before adding more surface area.

## Included
- Explicit shared playback capability contract for Live/VOD/Series.
- Direct/HLS/FFmpeg fallback capability declaration.
- Playback reconnect/resume contract.
- Authenticated playback diagnostic snapshot endpoint.
- Browser helper to copy a combined playback/provider diagnostic snapshot.
- Real-provider verification checklist.
- Full repository release, ready for the existing PUBLISH workflow.

## Definition of Done
1. Live TV starts and recovers after a transient playback failure.
2. IPTV Movies start from catalogue to player.
3. Series open from catalogue to season/episode and episode playback.
4. Resume/Continue Watching remains functional.
5. Provider credentials never leave the server-side source layer.
6. Upgrade from v31.2.0 preserves configuration and data.

## Verification
Run `scripts/VERIFY-v32.0.0.ps1`, then perform real-provider playback tests before production rollout.
