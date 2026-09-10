# MyOnline TV v0.5.6 — TV & Remote UX

This release focuses on television and remote-control use without changing the working Live, Movies or Series playback APIs.

## Navigation
- Arrow keys move spatially to the nearest control in that direction.
- Enter/OK activates the focused control.
- Escape/Backspace returns to Home, unless fullscreen is active.
- Focus is remembered per view during the current browser session.

## Playback remote keys
- Media Play / Pause are supported.
- F enters fullscreen.
- Movies and Series: Media Rewind / Fast Forward or J / L seek 10 seconds.
- Live TV playback behavior is intentionally left unchanged.

## TV presentation
Remote use enables a stronger focus ring, larger cards and controls on large displays, plus a short remote-help overlay.

## Publishing
Use the same permanent script as future releases:

    PUBLISH.cmd

It reads the release version from VERSION.
