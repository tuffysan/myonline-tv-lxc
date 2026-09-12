# v31.1.0 — Personal Media Setup 2.0

## User experience
- First-login guide begins with **What do you want to use?** and only shows selected services.
- IPTV/Plex/Jellyfin credentials are tested **before** they are saved.
- IPTV discovery shows channel and group counts and lets the user hide unwanted groups during setup.
- Plex/Jellyfin discovery lets the user choose libraries immediately after connection.
- A final summary shows the user's private connected sources.
- The setup guide can be rerun at any time from **My Sources**.
- A user with no sources gets a useful Home welcome screen instead of an empty catalogue.

## Privacy/security
- Sources remain strictly per-user; there is no source sharing.
- Cross-user source IDs return HTTP 404 rather than disclosing that another user's source exists.
- My Sources now reads the real IPTV/Plex/Jellyfin stores instead of the legacy source-access UI.
- Secrets remain server-side and are not returned after storage.

No mandatory external service or recurring runtime cost is introduced.
