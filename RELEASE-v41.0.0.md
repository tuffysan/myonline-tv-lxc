# MyOnlineTV v41.0.0 — Playback & UX Quality Release

Focus: freeze the v40 playback/UX stack behind an integrated release quality gate before new feature work resumes.

## Quality gate
- Protects Playback Reliability, Instant Seek, Adaptive Buffer, Player Experience, Movies & Series UX and Live TV Reliability as one integrated stack.
- Prevents regression to a disabled seek timeline or an unbounded desktop player.
- Protects Resume/Start Over, Up Next and watched-state continuity.
- Protects Live TV reconnect, stale-channel generation guard and the 12-segment independent HLS live window.
- Keeps all existing v40 regression gates additive.

## Acceptance test matrix
The automated source gate is supplemented by manual/end-to-end playback validation before production promotion:
- 2-hour VOD playback without manual intervention.
- 100 mixed buffered/unbuffered seeks without a broken player or process storm.
- Pause/resume and fullscreen/inline transitions.
- Resume after refresh and Continue Watching position accuracy.
- Series Up Next / cancel / immediate next episode.
- Live TV rapid channel changes and transient network recovery.
- Desktop, tablet and mobile player usability.

The repository gate validates implementation invariants; real media/network endurance scenarios remain end-to-end acceptance tests and are not falsely simulated by source-string checks.
