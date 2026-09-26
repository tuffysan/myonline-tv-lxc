# MyOnline TV v40.4.2 — Release Gate Hardening

## Fixes
- Fixed ReleaseTests failure caused by pinning Streaming Engine regression coverage to the historical `40.3.0` version string.
- Hardened VOD Seek, Streaming Engine, and Playback Resilience regression tests to verify capability/version markers without requiring an obsolete release number.
- Preserves the v40.4.1 VOD Seek & A/V Sync build fix and all v40.4.x playback behavior.

## Regression policy
Feature regression tests must verify the feature/capability contract rather than pinning an implementation marker to the release in which the feature was introduced. This prevents valid later releases from failing solely because their runtime version marker advanced.
