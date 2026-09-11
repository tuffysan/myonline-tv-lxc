# v30.0.1 — Admin 2.0

A full usability redesign of the existing Administration page.

## What changed

- Replaced the single very long Admin page with six focused sections:
  - Overview
  - Sources
  - Users & profiles
  - Storage
  - Navigation
  - System
- Added an actionable Overview with configuration health and “Needs attention”.
- Added quick actions for the most common administration tasks.
- Reworked IPTV/Plex/Jellyfin into source cards with clear status and actions.
- Reworked user management into compact account rows.
- Separated viewer profiles from login accounts.
- Reworked profile permissions into a structured permission matrix.
- Reworked storage targets into focused cards with DVR/download defaults.
- Reworked menu management so it no longer dominates the first screen.
- Moved diagnostics, appliance, feature audit and system overview into a dedicated System area.
- Added responsive/mobile Admin layout.
- Preserved existing API routes and existing save/edit/test functions.

## Design goal

Admin should answer these questions immediately:

1. Is the system configured correctly?
2. Is anything worth my attention?
3. Where do I go to fix it?

No new mandatory external service or recurring cost is introduced.
