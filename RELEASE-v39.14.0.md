# MyOnlineTV v39.14.0 — Movies & Series 3.0

## Goal
Build the VOD experience on top of Playback Engine 3.0 instead of introducing separate playback paths.

## Included
- Shared normalized detail model for Movies and Series.
- Resume progress calculation.
- Resume and Start Over playback actions.
- Season and episode grouping.
- Consistent episode labels.
- Next-episode resolution.
- VOD search.
- Sorting by title, year and recently updated.
- Playback requests delegated to Playback Engine 3.0.

## Release safety
All existing regression/security tests from v39.13.1 remain. New Movies & Series 3.0 tests are additive.

The updater backup rules introduced in v39.13.1 remain protected:
- `backups`, `downloads` and `live-hls` excluded from pre-update backup.
- Only three newest pre-update backups retained.
- Cleanup occurs after successful backup creation.

Zero-Python build/test/release/deployment remains mandatory.

## Validation
Run on Windows:

    .\RELEASE.cmd

Do not publish v39.14.0 unless the complete gate passes.
