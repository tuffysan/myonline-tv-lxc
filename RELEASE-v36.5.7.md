# MyOnline TV v36.5.7 — Release Asset Upload Fix

This release removes the custom GitHub Release upload implementation that caused repeated publication failures.

## Fix

The workflow now uses GitHub CLI's supported `gh release create TAG files...` path. GitHub CLI creates an internal draft, uploads all four release assets, and publishes only after the uploads complete. There is no manual `uploads.github.com` call, no `curl | jq` pipeline, and no custom draft release-ID discovery.

After creation, the workflow verifies that the release is public and that all four mandatory assets exist with non-zero size.

The Mobile & Tablet Scroll Fix from v36.5.6 is retained.
