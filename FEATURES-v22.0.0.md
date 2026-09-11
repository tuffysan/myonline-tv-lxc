# v30.1.0 — Stable Platform

Feature freeze, zero-cost policy and release-gate evaluator for stable promotion.

## Definition of done
This increment contains executable policy/decision logic and a discoverable platform API. It does not claim provider/device capabilities that are unavailable at runtime.

## Product rules
- Zero mandatory MyOnline TV runtime cost.
- No required commercial AI, metadata, monitoring or cloud service.
- Credentials remain server-side.
- Existing proven playback routes are preserved unless explicitly migrated.
- Runtime verification on CT145 and real clients is still required before calling the release production-verified.
