# Shared by publisher and regression tests. No Git mutations.
function Assert-ReleaseVersion {
  param([string]$Candidate, [string[]]$KnownTags)
  if ($Candidate -notmatch '^\d+\.\d+\.\d+$') { throw "Candidate '$Candidate' is not semantic version X.Y.Z." }
  $next=[version]$Candidate
  $baseline=[version]'39.8.4'
  foreach($name in $KnownTags){ if($name -match '^v\.?([0-9]+\.[0-9]+\.[0-9]+)$'){ $published=[version]$Matches[1]; if($published -gt $baseline){$baseline=$published} } }
  if($next -le $baseline){ throw "Candidate $Candidate must exceed established release $baseline. Never overwrite tags or decrease the version." }
  $validPatch=$next.Major -eq $baseline.Major -and $next.Minor -eq $baseline.Minor -and $next.Build -eq ($baseline.Build+1)
  $validMinor=$next.Major -eq $baseline.Major -and $next.Minor -eq ($baseline.Minor+1) -and $next.Build -eq 0
  $validMajor=$next.Major -eq ($baseline.Major+1) -and $next.Minor -eq 0 -and $next.Build -eq 0
  if(-not($validPatch -or $validMinor -or $validMajor)){ throw "Candidate $Candidate must be the next patch, next minor .0, or next major .0.0 after $baseline." }
}
