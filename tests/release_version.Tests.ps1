$ErrorActionPreference='Stop'
. "$PSScriptRoot/../scripts/Release-VersionGuard.ps1"

function Expect-Accept([string]$Candidate,[string[]]$Tags) {
  Assert-ReleaseVersion $Candidate $Tags
}

function Expect-Reject([string]$Candidate,[string[]]$Tags) {
  $failed=$false
  try { Assert-ReleaseVersion $Candidate $Tags } catch { $failed=$true; Write-Host "Expected rejection: $Candidate" }
  if(-not $failed){ throw "Expected rejection but VersionGuard accepted: $Candidate" }
}

# Intermediate releases may be skipped.
Expect-Accept '39.19.0' @('v39.17.0','v39.8.5','v37.1.0')
Expect-Accept '39.19.0' @('v39.8.3','v37.1.0')
Expect-Accept '40.0.0'  @('v39.19.0','v39.17.0')
Expect-Accept '39.10.0' @('v39.9.2','v39.8.5')

# Same version and downgrades remain blocked.
Expect-Reject '39.19.0' @('v39.19.0','v39.17.0')
Expect-Reject '39.18.0' @('v39.19.0','v39.17.0')
Expect-Reject '39.19.0' @('v40.0.0','v39.19.0')

Write-Host 'PASS: skipped intermediate releases allowed; same/older versions blocked.'
