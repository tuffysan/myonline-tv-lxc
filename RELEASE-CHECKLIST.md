# MyOnline TV v1.0.0 release checklist

## Build
- Run `PUBLISH.cmd`.
- Local .NET restore succeeds.
- Local .NET Release build succeeds with zero errors.
- GitHub Validate workflow succeeds.
- GitHub Release workflow succeeds.

## Core runtime
- Sign in / sign out.
- Profiles and permissions.
- IPTV Live TV playback.
- Guide / EPG.
- IPTV Movies playback, duration, seek and resume.
- IPTV Series playback, watched state and next episode.
- Plex menu, Movies, Series and playback.
- Jellyfin menu, Movies, Series and playback.
- Continue Watching progress / resume / remove / clear.
- Recently Watched exact navigation / remove / clear.
- Poster recovery.
- Downloads.
- DVR scheduling / recording / completed file.

## Device UX
- Desktop Chrome/Edge.
- Mobile portrait.
- Tablet portrait and landscape.
- TV / D-pad navigation.
- Fullscreen player.
- Horizontal rails and Guide scrolling.

Do not promote v1.0.0 as the production baseline until all applicable checks pass in the target LXC.
