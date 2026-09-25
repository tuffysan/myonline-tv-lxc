# MyOnlineTV v39.16.0 — Profiles & Family 3.0

## Goal
Turn the existing isolation work into a clearer profile/family model without weakening server-side authorization.

## Included
- Normalized profile model.
- Profile-scoped client state.
- Kids profile policy.
- Adult-content opt-in policy; Kids profiles can never enable Adult content.
- PIN-protection metadata.
- Explicit profile areas:
  - Favorites
  - Continue Watching
  - History
  - Search history
  - Downloads
  - Recent channels
- Migration helper for profile-scoped Search & Discovery history.

## Security rule
Client-side filtering is only presentation logic. Existing server-side authorization and multi-user isolation remain the security boundary. No profile helper is permitted to grant access to another user's data.

## Regression policy
All previous tests remain, including Search & Discovery 2.0, Movies & Series 3.0, Playback Engine 3.0, Live TV 2.0, IPTV Manager 2.0, updater backup retention and multi-user isolation.

New Profiles & Family 3.0 .NET release checks are additive.

Zero-Python build/test/release/deployment remains mandatory.

## Validation
Run:

    .\RELEASE.cmd

Do not publish v39.16.0 unless the complete release gate passes.
