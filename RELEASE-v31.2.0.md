# v32.0.0 — Source Architecture

- Makes SQLite `sources.user_id` the authoritative source owner.
- Access checks resolve authenticated user ID and source owner ID.
- New IPTV/Plex/Jellyfin sources persist ownership in SQLite.
- Legacy owner fields are retained only for migration compatibility.
