# v7.1.0 — Production Hardening
Adds explicit hardening configuration contracts for provider timeout, playback startup timeout, retries, FFmpeg concurrency and stale sessions, plus dependency-health records. Existing health/readiness APIs remain the integration point. This release does not claim runtime retry middleware where the existing route has not been rewired.
