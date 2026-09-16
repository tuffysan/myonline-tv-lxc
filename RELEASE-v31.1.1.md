# v31.2.0 — Onboarding Skip Hotfix

- Fixes the first-login guide appearing after every login when no media source is configured.
- Adds a persistent **Skip for now** action.
- Skip state is stored per user on the server, so it survives logout, restart and switching devices.
- Adds `/api/onboarding/skip` and `/api/onboarding/restart`.
- `required` is now false when onboarding is either completed or skipped.
- Users can restart the setup guide later from My Sources/Home.
- Completing onboarding no longer requires at least one source.
