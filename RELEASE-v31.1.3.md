# v31.1.3 — Onboarding Buttons Fix

Fixes the actual first page of Personal Media Setup.

The "What do you want to use?" page now visibly contains:

- Continue
- Skip for now
- Never show this guide again

Behavior:
- Skip for now stores a per-user skipped state and closes the guide.
- Never show this guide again stores a persistent per-user suppression state.
- The permanent state survives logout, restart and use from another device.
- The guide can still be started manually from My Sources.
- Manual setup mode shows Cancel instead of the automatic-login dismissal buttons.

Also fixes the source cards so title and description render on separate lines instead of visually merging text such as "PlexYour Plex server...".
