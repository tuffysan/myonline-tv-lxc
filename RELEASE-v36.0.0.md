# MyOnline TV v36.0.0 — TV Product Experience

Version 36 turns the existing web application into a more deliberate ten-foot product when it runs on a TV-class device. It keeps the same backend, media sources, profiles and deployment pipeline while adding a TV-specific interaction layer.

## TV shell
- Remote-first launcher for Home, Live TV, Guide, Movies, Series and Search.
- Home/Menu opens the launcher without losing the current playback context.
- Back closes TV overlays first, then returns to Home.
- Focus is remembered per view and focused content is kept visible.

## Playback
- TV playback overlay exposes Play/Pause, Live TV, Guide and Home.
- Media Play/Pause and standard D-pad controls remain supported.
- Playback chrome fades while the viewer is inactive and returns on remote input.

## Ten-foot presentation
- Larger controls and typography.
- Safe-area/overscan padding.
- Strong high-distance focus treatment.
- TV rails and grids use lower information density than desktop.

## Compatibility
Desktop, tablet and mobile keep their existing layouts. The TV product layer activates only in TV mode. VERSION remains the build/runtime source of truth.
