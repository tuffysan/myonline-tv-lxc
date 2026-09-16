# v9.1.0 — Source Engine

Adds `SourceEngineV2` as the common authorization boundary for effective sources.

Target integration:
- Live
- Guide
- Movies
- Series
- Search
- Library
- Playback

The legacy routes remain compatible, but production readiness requires wiring every source-bearing route through this service and verifying direct-route access cannot bypass policy.
