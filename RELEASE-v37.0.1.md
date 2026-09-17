# v37.0.1 – Resilient GitHub Release Upload

This release preserves the v37.0.0 Library Management & Provider Refresh functionality and hardens GitHub Release publication.

The release workflow now creates the release first, uploads assets one-by-one with retry/backoff, resumes a partial release for the same tag, replaces individual assets safely, and verifies the complete mandatory asset set before marking the release as latest.
