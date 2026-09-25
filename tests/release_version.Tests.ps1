$ErrorActionPreference='Stop'
. "$PSScriptRoot/../scripts/Release-VersionGuard.ps1"
Assert-ReleaseVersion '39.9.2' @('v39.9.1','v39.9.0','v39.8.5','v39.8.4','v37.1.0')
Assert-ReleaseVersion '39.8.6' @('v39.8.5','v37.1.0')
Assert-ReleaseVersion '40.0.0' @('v39.8.5')
$bad=@(
 @{Version='39.8.5';Tags=@('v39.8.5')},
 @{Version='39.10.0';Tags=@('v39.8.5')},
 @{Version='40.1.0';Tags=@('v39.8.5')},
 @{Version='39.8.7';Tags=@('v39.8.5')}
)
foreach($case in $bad){$failed=$false;try{Assert-ReleaseVersion $case.Version $case.Tags}catch{$failed=$true};if(-not $failed){throw "Expected rejection: $($case.Version)"}}
Write-Host 'PASS: semantic patch/minor/major progression, anomaly handling, collision and skipped-version guards.'
