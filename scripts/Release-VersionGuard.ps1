# Shared by publisher and regression tests. No Git mutations.
function Assert-ReleaseVersion {
  param(
    [Parameter(Mandatory=$true)][string]$Candidate,
    [string[]]$KnownTags = @()
  )

  if ($Candidate -notmatch '^\d+\.\d+\.\d+$') {
    throw "Candidate '$Candidate' is not semantic version X.Y.Z."
  }

  $candidateVersion = [version]$Candidate
  $publishedVersions = @()

  foreach ($name in $KnownTags) {
    if ($name -match '^v\.?([0-9]+\.[0-9]+\.[0-9]+)$') {
      $publishedVersions += [version]$Matches[1]
    }
  }

  if ($publishedVersions.Count -eq 0) {
    Write-Host "No previous published version found; accepting first release $Candidate."
    return
  }

  $currentVersion = $publishedVersions | Sort-Object -Descending | Select-Object -First 1

  # Intermediate releases may be skipped. Only same/older candidates are blocked.
  if ($candidateVersion -le $currentVersion) {
    throw "Candidate $Candidate must be newer than current release $currentVersion."
  }

  Write-Host "Version upgrade accepted: $currentVersion -> $Candidate"
}
