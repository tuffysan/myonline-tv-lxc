# v31.1.2 — SQLite Database & Migration

- Adds SQLite with WAL mode and schema migrations.
- Adds persistent tables for users, source ownership, source health, EPG aliases, media index and user settings.
- Keeps legacy JSON files readable during migration so upgrades are non-destructive.
- Adds `/api/database/status`.
