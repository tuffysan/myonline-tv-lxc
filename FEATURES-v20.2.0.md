# MyOnline TV v20.6.1 — TV Experience

This release turns the existing Live TV/EPG capabilities into a denser TV-first experience.

## Implemented
- Two-pane Live TV layout: compact channel rail + player/program panel.
- Compact channel rows with logo, current programme and inline actions.
- **Hide channel is now on the right side**, next to Play / Record / Favourite.
- Selected-channel programme details with progress and next programme.
- Record current channel and create series rule from the Live TV details panel.
- Improved player controls and status row.
- Premium EPG visual treatment with stronger current-programme and current-time emphasis.
- Home screen “On TV now” rail based on existing channel + EPG endpoints.
- Responsive behaviour for desktop, tablet and mobile.
- Keeps existing HLS/FFmpeg playback, DVR, provider handling and server-side credentials.
- Zero mandatory runtime cost remains a hard requirement.

## Important
This version does not claim new provider capabilities that the backend/provider does not expose.
Catch-up/Start Over, PiP and Multi-view are therefore not faked by the UI.
