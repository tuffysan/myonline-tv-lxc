\
$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$script=Get-Content (Join-Path $PSScriptRoot "update-local.sh") -Raw
@(
  'FINAL_VERIFY=1',
  'Final backend/reverse-proxy verification failed.',
  'Rolling back to v${CURRENT_VERSION}',
  'Rollback verified:',
  'CRITICAL: rollback was activated',
  'http://127.0.0.1:5080/ready',
  'http://127.0.0.1/health'
) | ForEach-Object {
  if(-not $script.Contains($_)){ throw "Missing updater safety marker: $_" }
}
Write-Host "v30.2.0 updater safety markers verified." -ForegroundColor Green
