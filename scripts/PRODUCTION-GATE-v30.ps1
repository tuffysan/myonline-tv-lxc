\
        $ErrorActionPreference="Stop"
        $root=Split-Path -Parent $PSScriptRoot
        & (Join-Path $PSScriptRoot "VERIFY-v30.0.0.ps1")
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
