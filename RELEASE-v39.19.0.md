# MyOnlineTV v39.19.0 — Experience Migration

## RC3 — VersionGuard test correction

- Replaced the stale sequential-version PowerShell test cases.
- 39.17.0 -> 39.19.0 and other forward skips are explicitly accepted.
- Same-version releases and downgrades remain rejected.
- VersionGuard now logs the actual newest published tag instead of a blank current version.
- Added permanent .NET regression checks for this policy.


## RC2 — Release VersionGuard fix

Release candidates no longer have to be the immediately following patch/minor/major version.
Intermediate releases may be skipped. The guard now requires only that the candidate is
strictly newer than the latest published release.

Examples:
- 39.17.0 -> 39.19.0: allowed
- 39.8.3 -> 39.19.0: allowed
- 39.19.0 -> 40.0.0: allowed
- 39.19.0 -> 39.19.0: blocked
- 39.19.0 -> 39.18.0: blocked

Upgrade compatibility remains separately governed by release metadata/schema/migration checks.


## Goal
Prepare v40.0.0 without a risky big-bang UI rewrite.

This release introduces a shared design-system bridge alongside the existing v39 UI. Existing selectors and flows remain intact while new shared component contracts become available.

## Shared tokens
- Spacing
- Radius
- Typography
- Motion
- Responsive breakpoints

## Shared components
- MediaCard
- Hero
- Rail
- Navigation
- Dialog

## Device targets
- Mobile
- Tablet
- Desktop
- TV

## Accessibility
- Explicit focus-visible treatment.
- Reduced-motion support.
- Larger TV focus treatment.

## Migration rule
v39.19.0 is additive and compatibility-first. Existing UI is not removed. v40 can migrate surfaces incrementally onto these shared contracts.

## Regression policy
All previous release tests remain, including Performance & Reliability, Downloads 2.1, Profiles & Family 3.0, Search & Discovery 2.0, Movies & Series 3.0, Playback Engine 3.0, Live TV 2.0, IPTV Manager 2.0, Continue Watching, multi-user isolation and updater backup retention.

New Experience Migration .NET checks are additive.

Zero-Python build/test/release/deployment remains mandatory.

## Validation
Run:

    .\RELEASE.cmd

Do not publish v39.19.0 unless the complete release gate passes.
