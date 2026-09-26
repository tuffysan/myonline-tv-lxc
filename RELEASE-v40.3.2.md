# MyOnlineTV v40.3.2 — Inline Player Stage Fix

Fixes the desktop inline VOD player geometry by separating the 16:9 stage from the video element. The stage owns layout and the video is pinned to all four stage edges. Fullscreen remains unchanged in behavior.

Release regression tests now require the stage wrapper in both VOD creation paths and verify absolute edge-to-edge video sizing.
