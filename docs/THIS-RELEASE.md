# MyOnline TV v0.5.4 — Stability & Cache Foundation

This release focuses on resilience rather than new media features.

## Catalogue cache
Movies and Series catalogue JSON is now persisted to disk. Cached data can be served immediately for up to six hours while the provider is refreshed in the background.

## Manual refresh
Movies and Series each include a Refresh button. Refresh clears browser and server catalogue cache for the active provider and reloads the catalogue.

## Publish helper
Run `PUBLISH-v0.5.4.cmd` from the repository root. It commits, pushes main, safely recreates the v0.5.4 tag only when needed, and triggers the GitHub Actions release workflow.
