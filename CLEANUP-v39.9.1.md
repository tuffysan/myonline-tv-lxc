# MyOnlineTV v39.9.1 repository cleanup

This cleanup removes generated build output and superseded one-off release material without changing application functionality.

Removed:
- `tests/DownloadHeaders/bin/` and `obj/` generated .NET output.
- Superseded root `FEATURES-v*.md`, historical `RELEASE-v*.md`, `HOTFIX-v*.md`, and versioned release-checklist files. Current `RELEASE-v39.9.1.md` is retained.
- Obsolete one-off GitHub repair/publish helper scripts replaced by the canonical `RELEASE.cmd` / `RELEASE.ps1` and `PUBLISH.cmd` / `PUBLISH.ps1` flow.
- Old `RELEASE-FILES-v39.8.3.txt` and v35 GitHub hotfix helper.

Added:
- `.gitignore` rules for .NET build output, Node/Python caches, local archives/logs and temporary patch/recovery files.

Retained:
- Application source, clients, tests, canonical release/publish scripts, LXC install/update/uninstall scripts, operational/security/architecture documentation, roadmap, current release notes and release metadata.
