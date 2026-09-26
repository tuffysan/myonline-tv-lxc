# MyOnlineTV v40.8.1 – Instant Seek Release Gate Fix

## Purpose
Hardens the Continuous VOD regression gate after the v40.8.0 Instant Seek implementation changed explanatory source comments.

## Changes
- Continuous VOD release tests now verify executable handover capabilities instead of an exact comment string.
- Verifies active old session capture, replacement session creation, ready-state handover, activation of the replacement session, cleanup of the old session, and seek-failure fallback.
- Instant Seek playback behavior from v40.8.0 is unchanged.
- Smart VOD Buffering and Playback Reliability remain unchanged.

## Release rule
The gate tests behavior/capability markers and must not require prose comments for playback functionality.
