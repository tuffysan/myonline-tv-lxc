$ErrorActionPreference = "Stop"
# Keep this entry point, composing the repository's maintained local gates.
# The removed VERIFY-v31.2.0.ps1 was never present in repository history.
& (Join-Path $PSScriptRoot "Validate-Architecture.ps1")
& (Join-Path $PSScriptRoot "ARCHITECTURE-GATE.ps1")
& (Join-Path $PSScriptRoot "../tests/release_version.Tests.ps1")
Write-Host "Local structural checks passed; this is not runtime production sign-off." -ForegroundColor Green
        Write-Host ""
        Write-Host "Runtime sign-off still required:" -ForegroundColor Yellow
        @(
          "Clean LXC install",
          "Upgrade from supported prior version",
          "Home/Live/Guide/Movies/Series/Unified Library",
          "DVR rule -> recording file -> playback",
          "Backup -> restore",
          "Android TV / D-pad",
          "Mobile/tablet/desktop",
          "Long-running Live TV",
          "Security checklist"
        ) | ForEach-Object { Write-Host " [ ] $_" }
