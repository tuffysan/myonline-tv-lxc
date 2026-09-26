# MyOnlineTV v41.0.8 — VOD Player Layout Root Fix

Fixes the VOD player being pushed into the right side of desktop layouts.

## Root cause
The playback host was reused or appended inside the active content surface. Desktop Home and collection layouts could therefore influence its geometry. Adding grid-column rules to the player itself did not fix the parent-layout problem.

## Fix
- VOD playback host is mounted directly under `<main>`, outside Home/collection grids.
- While VOD playback is active, normal `#content` is hidden so launcher cards cannot compete with the player layout.
- Desktop player is centered with a hard maximum width of 1120 px.
- Mobile remains full width.
- Navigating to another view removes the dedicated playback surface and restores normal content.
- Playback, buffering, seek, Live TV and fullscreen logic are otherwise unchanged.
- Release regression test now protects the root mounting strategy instead of checking a cosmetic CSS selector.
