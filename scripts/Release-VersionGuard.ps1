# Shared by the existing publisher and its regression tests. No Git mutations.
function Assert-ReleaseVersion {
  param([string]$Candidate, [string[]]$KnownTags)
  if ($Candidate -notmatch '^39\.8\.\d+$') {
    throw "Release line must remain 39.8.x; inspect RELEASE.md before changing the scheme."
  }
  $next = [version]$Candidate
  $baseline = [version]'39.8.4'
  foreach ($name in $KnownTags) {
    if ($name -match '^v\.?([0-9]+\.[0-9]+\.[0-9]+)$') {
      $published = [version]$Matches[1]
      if ($published -gt $baseline) { $baseline = $published }
    }
  }
  if ($next -le $baseline) {
    throw "Candidate $Candidate must exceed established release $baseline. Never overwrite tags or decrease the version."
  }
  if ($next.Major -ne $baseline.Major -or $next.Minor -ne $baseline.Minor -or $next.Build -ne ($baseline.Build + 1)) {
    throw "Candidate must be the next patch after $baseline; inspect conflicting version history."
  }
}
