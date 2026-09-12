# v30.2.0 — Android TV Product

Android-TV product contract, playback readiness policy and D-pad UX checklist.

## Definition of done
This increment contains executable policy/decision logic and a discoverable platform API. It does not claim provider/device capabilities that are unavailable at runtime.

## Product rules
- Zero mandatory MyOnline TV runtime cost.
- No required commercial AI, metadata, monitoring or cloud service.
- Credentials remain server-side.
- Existing proven playback routes are preserved unless explicitly migrated.
- Runtime verification on CT145 and real clients is still required before calling the release production-verified.
