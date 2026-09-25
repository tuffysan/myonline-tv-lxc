# MyOnlineTV v40.1.1 — Release Gate Fix

v40.1.1 is a maintenance release for the v40.1 Home Experience 3.0 line. It keeps the Home Experience 3.0 implementation and feature marker introduced in v40.1.0 unchanged while correcting the release-gate path used to validate and publish the project.

## Changes
- Release metadata advanced from 40.1.0 to 40.1.1.
- Artifact target advanced to `myonline-tv-web-v40.1.1-linux-x64.tar.gz`.
- Home Experience 3.0 remains feature version `40.1.0` by design.
- Existing v40.1.0 tag/release remains immutable and is not overwritten.
- Previous regression, updater, security and Zero-Python gates remain enabled.

## Release
Run `./RELEASE` from the repository root after committing the v40.1.1 changes. The release gate must create a new `v40.1.1` tag rather than modifying `v40.1.0`.
