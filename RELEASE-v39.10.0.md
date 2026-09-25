# MyOnlineTV v39.10.0 — Continue Watching 2.0

## Highlights
- Continue Watching action menu now supports Continue, Start from beginning, Mark as watched, and Remove.
- Full Continue Watching collection gains search and sorting.
- Progress is shown consistently in the collection view.
- Existing profile/user isolation remains mandatory.
- Release gate adds Continue Watching 2.0 source regression guards.
- Release, deployment and self-update tooling no longer requires Python.

## Compatibility
No data-schema migration is required. Existing Continue Watching rows remain compatible.

## RC2 release tooling fix
- Release gate now probes `py.exe -3`, `python3.exe`, and `python.exe` and selects the first healthy Python 3 runtime.
- Python probes validate the standard library plus `encodings`, `json`, and `unittest` before tests start.
- `PYTHONHOME` and `PYTHONPATH` are ignored only inside the release process and are restored afterwards.
- A broken `python.exe` no longer blocks release when another complete Python 3 installation is available.

## RC3 release-gate hardening
- Python is now optional for local release execution.
- Healthy Python still runs the full existing black-box Python suites.
- If Python is unavailable/broken, PowerShell source/security fallback gates run instead; the release no longer fails solely because of Python installation health.
- .NET build, DownloadHeaders runtime tests, version gate, production gate and GitHub release verification remain mandatory.

## RC4 - .NET-only release tests
- Removed the Python runtime dependency from the release gate.
- Ported all Python source-regression checks to `tests/ReleaseTests` (.NET 10).
- Ported Continue Watching persistence/restart/concurrency checks to .NET black-box tests against real Kestrel.
- Ported the core multi-user account/profile/provider isolation checks to .NET black-box tests.
- Python test files are no longer shipped or invoked by `RELEASE.ps1`.
- Existing PowerShell security/source gates remain as an additional independent layer.

### RC6 release-gate fix
- Defines `Invoke-PSGate` before the security/static gates execute.
- Validates that each PowerShell gate file exists and propagates its exit code as a blocking release failure.
- Keeps the permanent no-Python build/test/release rule; application regression tests remain .NET 10 based.


### RC7 - zero-Python distribution chain
- Removed remaining Python runtime use from Linux self-update, deployment metadata validation and runtime smoke tests.
- JSON fields needed by shell tooling are validated with POSIX/GNU shell utilities.
- `AGENTS.md` now makes zero Python dependency a permanent rule for build, test, release, deployment and update tooling.
- Release validation rejects future executable-script Python dependencies.


## RC8 - Zero Python GitHub Actions
- Migrated GitHub Actions Continue Watching and multi-user regression execution to tests/ReleaseTests (.NET 10).
- Replaced workflow release.json parsing with POSIX shell/sed validation.
- GitHub workflows now comply with the permanent no-Python distribution policy.
