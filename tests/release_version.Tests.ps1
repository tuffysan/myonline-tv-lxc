$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/Release-VersionGuard.ps1')
Assert-ReleaseVersion '39.8.4' @('v39.8.1','v39.8.2','v39.8.3','v37.1.0')
Assert-ReleaseVersion '39.8.10' @('v39.8.9','v39.8.3','v37.1.0')
foreach ($case in @(
  @{ Version='37.1.1'; Tags=@('v39.8.3','v37.1.0') },
  @{ Version='39.8.4'; Tags=@('v39.8.4') },
  @{ Version='39.8.4'; Tags=@('v.39.8.4') },
  @{ Version='39.8.4'; Tags=@('v40.0.0') },
  @{ Version='39.8.5'; Tags=@('v39.8.3') }
)) {
  $rejected=$false
  try { Assert-ReleaseVersion $case.Version $case.Tags } catch { $rejected=$true }
  if (-not $rejected) { throw "Unsafe release candidate accepted: $($case.Version)" }
}
Write-Host 'PASS: release anomaly, numeric patch ordering, tag collisions, higher release and skipped patch guards.'
