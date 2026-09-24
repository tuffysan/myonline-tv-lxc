# MyOnlineTV project instructions

These instructions apply to the entire repository. The commands below are user
requests, not shell aliases. Do not trigger them when their names are merely
quoted, documented, or discussed.

## Repository conventions

- `VERSION` is the product version source of truth. Read it each time; never
  infer the current version from the highest-numbered historical document.
- `app/MyOnlineTV.Web.csproj` is the production .NET 10 web project. Its package,
  assembly, file and informational versions derive from `VERSION`. Runtime
  version reporting must continue to derive from the assembly.
- `release.json` must match `VERSION`; its artifact name is
  `myonline-tv-web-v<VERSION>-linux-x64.tar.gz`. Preserve independent schema,
  protocol and minimum-upgrade versions unless a change requires updating them.
- Inspect all active product-version references, including client packaging and
  metadata. Update applicable references without changing dependency versions,
  historical release records or independently versioned components blindly.
- Keep `README.md` version-independent. Update `CHANGELOG.md` and GitHub release
  notes. Do not create new `RELEASE-v*.md`, `FEATURES-v*.md`, `HOTFIX-v*.md` or
  version-specific README files; existing ones are historical documentation.
- The documented publisher is `PUBLISH.cmd`, which calls `PUBLISH.ps1` with
  `origin` and `main` by default. Verify the actual remote and branch first.
- `.github/workflows/validate.yml` validates main pushes, pull requests and
  manual runs. `.github/workflows/release.yml` builds the framework-dependent
  Linux x64 distribution and publishes GitHub Releases on `v*` tag pushes.
  Manual release-workflow dispatch alone does not publish a GitHub Release.
- Use canonical tags `v<VERSION>`. The workflow accepts legacy `v.<VERSION>`
  tags, but do not create new tags using that legacy spelling.

## Shared build and validation

Read the current workflows and scripts before running them. Use their existing
commands and checks rather than maintaining a separate release process.

1. Restore and build `app/MyOnlineTV.Web.csproj` in Release configuration.
   Run the publish checks from both workflows, including:
   `dotnet publish app/MyOnlineTV.Web.csproj -c Release -o dist/publish` and the
   release workflow's `linux-x64`, `--self-contained false` restore/publish steps.
2. Run the download regression harness:
   `dotnet run --project tests/DownloadHeaders/DownloadHeaders.csproj -c Release`.
3. Run the mobile browser tests using `tests/mobile/README.md` and the Validate
   workflow: install its dependencies and Playwright browser, then run
   `npm test --prefix tests/mobile`. An installed Edge channel is supported for
   local testing. These tests mock APIs; they do not prove real IPTV playback.
4. Run JavaScript syntax checks for `app.js`, `mobile.js` and `sw.js`, shell
   syntax checks, release metadata consistency and the workflows' regression
   markers. Run `git diff --check`.
5. Run the existing applicable gates, including
   `scripts/Validate-Architecture.ps1`, `scripts/ARCHITECTURE-GATE.ps1`,
   `scripts/DEPLOYMENT-GATE.sh` (which runs the bootstrap integration tests),
   and `scripts/check-loopback-binding.sh`. Inspect other test/validation
   scripts and execute those applicable to the current project and environment.
6. Inventory native-client builds and tests under `clients/android-tv` and
   `clients/apple-tv`; use their existing Gradle and Xcode/XcodeGen setup.
   `app/VikingIptv.csproj` is a legacy project, not the production release target.
   Report legacy-project problems separately instead of substituting it for
   `MyOnlineTV.Web.csproj`.
7. Use `RELEASE-CHECKLIST.md` and relevant smoke-test scripts for runtime/device
   validation. Do not run deployment, installation or production-mutating tests
   against a live system without authorization for that target.

Build the complete current project, not only changed files. Discover new tests
as the repository evolves. Fix failures caused by the current changes and rerun
affected checks. Report pre-existing failures and missing SDKs, OS support,
credentials or runtime targets explicitly; never count unavailable checks as
passes or claim complete verification while required checks remain blocked.

## BUILD

When the user says exactly `build`, perform the complete release operation:

1. Inspect Git status, staged/unstaged/untracked changes, branch and remotes.
   Fetch release/tag information without overwriting local tags. Identify the
   latest published release and its commit, then inspect all committed and
   working-tree changes since that release. Do not assume the highest tag or
   newest release document is the latest published release.
2. Determine the current version from `VERSION` and reconcile it with
   `release.json` and published releases. Increment the patch component once
   (`X.Y.Z` -> `X.Y.(Z+1)`). Stop and report conflicting version history rather
   than guessing, downgrading or reusing an existing release/tag.
3. Update all applicable version references and add a changelog entry covering
   all changes since the latest release. Prepare matching GitHub release notes.
4. Complete the shared build and validation above. Fix problems caused by the
   changes before publishing. Required failures or blocked checks prevent a
   successful release; do not waive them silently.
5. Review the exact release diff and files to be committed. The existing
   publisher uses `git add -A`; exclude generated files and secrets, and resolve
   any unexpected or unrelated changes before invoking it.
6. Use the existing publisher to commit the release, push the release commit,
   create the new annotated version tag and push that tag. Follow the publisher
   safety requirements below. Do not create a parallel publishing script.
7. Verify that the remote branch and tag point to the intended release commit.
   Follow the Validate and Release GitHub Actions runs for that exact commit
   and tag until they complete successfully. A successful local push or the
   publisher's completion message is not proof of a successful release.
8. Verify the published GitHub Release, its version/tag, release notes and all
   four required non-empty assets:
   - `myonline-tv-web-v<VERSION>-linux-x64.tar.gz`
   - `myonline-tv-lxc-v<VERSION>-source.tar.gz`
   - `SHA256SUMS-RELEASE.txt`
   - `release.json`
   Download the assets into a temporary verification directory, verify the
   manifest checksums and archive readability, and confirm the application
   archive contains the DLL, runtime configuration and required web assets,
   including `mobile.js` and `mobile.css`. Confirm metadata matches `VERSION`
   and the release is published, not a draft or prerelease. The workflow creates
   the checksum manifest; do not substitute the historical root `SHA256SUMS`.
9. Report final version, commit SHA, tag, build/test status, Actions status and
   release status, with the relevant GitHub links and any remaining limitations.

If publication fails after a commit or tag has been pushed, report that exact
partial state. Diagnose and rerun the existing workflow for the same immutable
commit when appropriate; never move the tag to make a failed release pass.

## TEST

When the user says exactly `test`:

- Build the complete project and run all available tests and validation using
  the shared procedure above.
- Fix problems caused by the current changes and rerun affected checks.
- Do not change the version.
- Do not commit, push, tag, publish a release or invoke the publisher.
- Report passed, failed and blocked checks accurately.

## RELEASE CHECK

When the user requests `release check`:

- Inspect release readiness: current changes, builds, tests, version consistency,
  changelog, publish scripts, tag collisions and GitHub Actions workflows.
- Run non-publishing build/test/validation checks as needed. Report existing
  results separately from checks performed during this request.
- Report problems, missing prerequisites and whether the repository is ready.
  This is an assessment; do not change source or version files without a
  separate request to fix the findings.
- Do not commit, push, tag, release or invoke the publisher.

## Publisher safety and general rules

- Never force push, overwrite/move an existing tag, or delete an existing release.
- Never ignore build or test failures. Missing tooling is a blocked check, not
  permission to skip validation and publish.
- Always use the repository's existing release scripts and workflows. Do not
  invent a parallel release process.
- Inspect `PUBLISH.ps1` before execution: its current collision handling can
  delete/recreate local tags and delete remote tags. These paths are forbidden.
  Check local and remote canonical and legacy tag names, plus existing releases,
  before publishing. Make the existing script fail safely on collisions if
  necessary; do not execute destructive replacement branches.
- Do not use legacy `PUBLISH-TO-GITHUB.ps1` or repair/hotfix helpers that force
  tags, reset branches, rewrite remotes or target an old repository. The safety
  rules here take precedence over unsafe behavior in any existing helper.
- `release.yml` can resume a partial release and replace individual assets.
  Restrict recovery to the intended immutable release commit; do not rerun it
  against an unrelated or already completed release to replace its contents.
- Preserve user work. Never automatically reset, clean, discard or stash changes,
  change repository identity/remotes, or bypass protected-branch requirements.
- Stop before destructive or unexpected operations, explain the specific issue,
  and obtain direction. Ordinary safe release steps are authorized by `build`;
  do not ask for redundant confirmation for those steps.
