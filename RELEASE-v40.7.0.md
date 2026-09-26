# MyOnlineTV v40.7.0 — Playback Reliability

Quality-focused roadmap release built on verified v40.6.3.

## Goals
- Stable uninterrupted VOD playback.
- Automatic recovery without requiring the user to press Play.
- Explicit playback states and measurable diagnostics.
- Never override an intentional user Pause.

## Reliability states
Idle, Preparing, Buffering, Playing, Seeking, Recovering, Paused, Ended, Error.

## Diagnostics
Available at runtime through `window.myOnlineTvPlaybackDiagnostics()` and includes buffer health, stalls, recoveries, underruns, seeks, time-to-first-frame and the latest recovery/error reason.
