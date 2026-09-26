# Playback & UX Quality Gate — v41.0.0

## Release rule
A build is not considered production-ready only because it compiles. `RELEASE.cmd` must pass, followed by playback acceptance testing with real media.

## Automated invariants
1. VOD Playback Reliability remains installed.
2. Instant Seek remains interactive and cancellable.
3. Adaptive Buffer remains installed on the VOD HLS path.
4. The desktop player remains contained at the established maximum size.
5. Resume/Start Over and Up Next remain present.
6. Live TV recovery and stale-channel protection remain present.
7. Server Live HLS keeps the expanded independent-segment window.

## End-to-end acceptance
Record pass/fail for: 2h VOD, 100 seeks, rapid seeks, 10s connectivity interruption, buffer underrun recovery, pause 10m/resume, fullscreen round-trip, A/V sync, refresh/resume, next episode, rapid Live TV channel changes, desktop, tablet and mobile.

Any failure blocks promotion and should receive a regression test at the lowest practical layer before the fix is released.
