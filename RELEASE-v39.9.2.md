# MyOnlineTV v39.9.2 — Playback Routing Fix

## Fixed
- Continue Watching on Home now always has a valid player host. Previously desktop Home could resolve a valid playback token and then silently stop because `#mediaPlayer` was not rendered.
- Movie favourites now start playback directly from Home/My List instead of navigating to Movies first.
- Playback host creation is shared and defensive across desktop, mobile, tablet and TV layouts.

## Release gate
`tests/playback_surfaces.py` now verifies that playback cannot silently return because a player host is missing and that favourite movie routing reaches `playServerMedia` directly.

Multi-user/profile isolation remains unchanged.
