# MyOnlineTV release version policy

Read this file before every `build` or `release check`. This version-history
protection takes precedence over calculating a patch directly from `VERSION`,
the nearest tag, the latest commit, or GitHub's latest-release response.
Use the existing publisher and workflows described in `AGENTS.md`.

## Established release line and known anomaly

Inspection on 2026-09-24 confirmed this ancestry (newest first):

- `34a110e`: WIP commit preserving unreleased work.
- `aae0972`: tagged `v37.1.0`; changed `VERSION` from `39.8.3` to `37.1.0`.
- `9aabf13`: tagged `v39.8.3`; `VERSION` was `39.8.3`.
- `3001d7e`: tagged `v39.8.2`.
- `d66f00e`: tagged `v39.8.1`.

GitHub release history also confirms that `v37.1.0` was published after
`v39.8.3`. Chronological recency therefore does not identify the correct
semantic-version baseline. The `v37.1.0` commit contains substantial code and
changelog changes; do not interpret it as permission to discard those changes
or restore the entire tree from `v39.8.3`.

Treat `v37.1.0` as a version-history anomaly until its purpose is established.
Its commit message and timing do not establish an intentional version reset.
Never delete, move or overwrite that tag or its release automatically.

The established release line is **39.8.x**. Preserve it unless the user
explicitly requests a different versioning scheme. The published v39.8.4 release is now the established baseline. The next patch is **v39.8.5**, not `v37.1.1`. Candidate availability must still be rechecked locally, on origin and in GitHub releases immediately before publication.

## Mandatory version calculation for build

1. Inspect current Git status and preserve all committed and uncommitted work.
   Read `VERSION`, `release.json`, Git ancestry, local and remote tags, and
   GitHub release history, including drafts/prereleases and legacy tag spelling.
   Read historical `VERSION` files and changelog diffs where records disagree.
2. Compare semantic versions numerically, not lexicographically or by commit,
   tag or publication date. Do not use `git describe` or `/releases/latest` as
   the sole baseline. A lower `VERSION` value must never lower the established
   release baseline.
3. Establish the highest valid released patch on the authorized 39.8.x line,
   with **39.8.4 as the minimum established baseline**. Inspect any higher
   version evidence before proceeding. Never automatically decrease a semantic
   version, switch release lines or reuse an existing version.
4. With 39.8.4 established as the released baseline, select 39.8.5. If 39.8.5 has
   already been released, inspect that release and calculate the next unused
   patch on the same line. If it exists only as a tag, draft or partial release,
   investigate its state rather than overwriting it or silently skipping it.
   Stop when conflicting history cannot be resolved from evidence.
5. Verify the candidate is absent from local tags, remote tags and GitHub
   releases under both `vX.Y.Z` and legacy `v.X.Y.Z` spellings immediately before
   publishing. If remote verification is unavailable, report the candidate as
   provisional and do not publish.
6. During an explicitly requested `build`, align `VERSION`, active product
   version references, artifact metadata and release notes with the validated
   candidate. Correct the anomalous metadata without reverting functionality.
   Do not rewrite historical tags or release records.
7. Review all unreleased changes against the established release baseline as
   well as the chronological latest release. Include changes introduced by the
   anomalous commit and subsequent WIP commits in that review; do not overlook
   removals or assume a WIP commit has been released.
8. Continue with the build, tests, safe publisher, Actions verification and
   artifact verification required by `AGENTS.md`. Report the baseline, chosen
   version and reasoning along with the final release result.

For `test`, keep versions unchanged. For `release check`, report the anomalous
metadata and proposed correction without changing it. Neither command permits
committing, pushing, tagging or publishing. Documentation changes alone do not
authorize a release.

## Executable protection and current candidate

`PUBLISH.ps1` uses `scripts/Release-VersionGuard.ps1` to compare the candidate
numerically with the established baseline, local/remote tags and published
release/draft tags before committing or pushing. Canonical and legacy spelling
collisions are rejected; tag deletion/replacement is forbidden. The regression
suite is `tests/release_version.Tests.ps1`.

v39.8.4 was subsequently published successfully and is the established baseline.
The current stabilization candidate is **39.8.5** in `VERSION` and `release.json`.
Do not publish it until the normal build/security gates pass and the target-LXC
runtime smoke test is completed.

## One-click release (v39.8.5+)

On a Windows development machine with Git, .NET 10 SDK, Python 3 and GitHub CLI installed/authenticated, run:

```powershell
.\RELEASE.cmd
```

`RELEASE.cmd` runs the local Release build, download-header regressions, Continue Watching tests, multi-user isolation tests, version guard and production gate. Only after those pass does it call the existing publisher to commit/push/tag. It then waits for `.github/workflows/release.yml` and verifies that the final GitHub Release is non-draft/non-prerelease and contains all four mandatory non-empty assets.

Release tags are immutable. The script aborts instead of replacing an existing local or remote version tag.

## Roadmap release line
After v39.8.5 the planned line is v39.9.0 Downloads 2.0, v39.10.0 Continue Watching 2.0, v39.11.0 IPTV Manager 2.0, v39.12.0 Live TV 2.0, then v40.0.0 MyOnlineTV Experience 2.0. The version guard accepts the next patch, next minor `.0`, or next major `.0.0` only.
