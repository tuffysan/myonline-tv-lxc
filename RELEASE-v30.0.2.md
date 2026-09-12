# v31.1.3 — Account Source Isolation

IPTV, Plex and Jellyfin sources are no longer treated as globally shared resources.

## Rules
- Every server-side IPTV/Plex/Jellyfin source belongs to an account and an owning user.
- The source owner always has access.
- Another user gets access only when the owner explicitly shares that source.
- Sharing candidates are restricted to enabled users whose `AccountOwnerUsername` matches the source account.
- A username from another account is rejected server-side even if a crafted API request tries to add it.
- Direct IPTV, EPG, VOD, Series, Live TV and media-library source routes enforce the same access rule.
- Unified Movies/Series results are filtered to media libraries visible to the signed-in user.
- Legacy sources are treated as owned by the primary existing account owner, preserving upgrades without exposing them across accounts.
- Credentials remain encrypted server-side.

No mandatory external service or recurring runtime cost is introduced.
