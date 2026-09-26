# MyOnline TV v41.0.12 — Player Layout Consolidation & Current Playback Contract

- Consolidates inline player geometry into one final layout policy.
- Keeps fullscreen unrestricted.
- Replaces historical playback implementation-string release gates with one current v41 playback contract.
- ReleaseTests no longer require obsolete v40.x/v41.0.x comments or exact implementation wording.
- Current contract protects buffering/recovery, intentional pause handling, interactive seek, adaptive buffer, Live TV recovery, Movies/Series continuity, player geometry and server HLS policy.
- Playback/cache implementation itself is not changed by the release-gate cleanup.

## Release gate consolidation follow-up
- Continue Watching no longer requires the retired `#playerWrap.dynamicMediaPlayer` CSS selector.
- Its regression guard now validates the current v41.0.12 root playback surface contract: `.mediaPlaybackSurface > .unifiedVideoPlayer`, centered with `margin:0 auto` and constrained to 960px.
- This prevents historical player-layout implementations from blocking the consolidated player architecture.
