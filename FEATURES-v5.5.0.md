# v5.5.0 — DVR Scheduler

- Promotes DVR engine/upcoming/conflict information into a reusable scheduler client facade.
- Surfaces conflict state globally and exposes the next scheduled recording.
- Existing series rules, NewOnly, padding, retention and storage-target behaviour remain cumulative.
- Does not migrate or discard existing recording data.
