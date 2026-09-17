# MyOnline TV v35.4.0 — Cross-device & Profiles

## Highlights
- Profile-scoped Live TV favourites and Continue Watching on the server.
- Movies/Series watched state, media favourites and recent activity synchronize through the existing profile-state API.
- Profile switching reloads the selected profile's server state before Home is rendered.
- Profile-state endpoints now validate that the authenticated user may access the requested profile.
- Legacy favourites/continue files remain migration fallbacks until a profile writes its own state.
- Runtime version remains sourced from VERSION -> assembly -> backend -> Web UI.

## Upgrade
Use the normal GitHub Release and Proxmox update flow. Persistent data is retained by the existing updater.
