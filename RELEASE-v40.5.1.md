# MyOnline TV v40.5.1 — Contained Player Layout Fix

- Restores the VOD player as a bounded desktop player card instead of a page-width cinema surface.
- Desktop maximum width is 1120 px; medium screens use up to 960 px; mobile remains responsive.
- Keeps the v40.5 unified overlay controls and v40.4 seek/A/V-sync engine.
- Full viewport sizing is used only while the player is explicitly in fullscreen.
- Leaving fullscreen always returns to the contained player card.
