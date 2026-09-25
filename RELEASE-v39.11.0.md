# MyOnlineTV v39.11.0 — IPTV Manager 2.0

IPTV Manager 2.0 consolidates provider administration into one user-scoped workspace.

## Highlights
- Overview dashboard for Live TV, Movies, Series and smart rules.
- Group search and filters: All, Active, Inactive, Adult (18+).
- Channel search, group/status filters, selection and bulk activate/deactivate.
- Adult groups require explicit enable action.
- Preview provider changes before reload.
- Reload Live TV while preserving visibility preferences.
- Automatic sync mode/interval and sync diagnostics/history.
- Movies/Series category and title visibility controls.
- Smart filtering rules and filter export/import.
- Provider settings remain isolated per MyOnlineTV user.

## Release quality
All previous .NET regression tests remain mandatory. v39.11.0 adds IPTV Manager 2.0 regression checks. Build/test/release/deployment/update remain Python-free.

## RC2 – Continue Watching regression fix
- Fixed concurrent state persistence by using a unique temporary file per atomic JSON write.
- Continue Watching input now tolerates omitted optional URL/timestamp fields and normalizes timestamps server-side.
- Improved .NET black-box test diagnostics so HTTP response bodies are printed correctly on failure.
- Existing and IPTV Manager 2.0 regression tests remain mandatory.
