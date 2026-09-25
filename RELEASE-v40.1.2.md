# MyOnlineTV v40.1.2 — Frontend Syntax Fix

v40.1.2 repairs the frontend syntax issue discovered by the v40.1.1 GitHub Actions release workflow.

## Changes
- Corrected Home Experience 3.0 rail action HTML quoting for Live Now, Movies, and Series.
- Added `node --check app/wwwroot/app.js` to the local RELEASE gate before build/publish/tag creation.
- Added Node.js as an explicit release-gate prerequisite so frontend syntax failures are detected locally.
- Product/release metadata advanced to 40.1.2.
- Home Experience 3.0 remains feature version 40.1.0.

## Release
Commit these changes and run `./RELEASE`. The release process must create a new immutable `v40.1.2` tag and must not modify v40.1.0 or v40.1.1.
