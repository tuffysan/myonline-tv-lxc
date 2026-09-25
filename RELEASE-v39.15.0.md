# MyOnlineTV v39.15.0 — Search & Discovery 2.0

## Goal
Provide one discovery model across Live TV and VOD without creating another playback path.

## Included
- Unified discovery index: Live TV, Movies, Series and Episodes.
- Text search across title, description and group/category.
- Media-type filters.
- Group/category filtering.
- Grouped result sections.
- Search suggestions.
- Profile-scoped recent searches.
- Clear recent searches.
- Result limits for predictable UI behavior.
- Playback through Playback Engine 3.0.

## Privacy / isolation
Recent searches are keyed by profile identifier. Existing multi-user isolation regression coverage remains mandatory.

## Regression policy
All previous tests remain. Search & Discovery 2.0 adds new .NET release-gate checks; it does not replace older tests.

The v39.13.1 backup-hardening tests and the v39.14.0 Movies & Series 3.0 tests remain protected.

Zero-Python build/test/release/deployment remains mandatory.

## Validation
Run:

    .\RELEASE.cmd

Do not publish v39.15.0 unless the complete release gate passes.
