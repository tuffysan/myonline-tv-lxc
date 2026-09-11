\
$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$p=Get-Content (Join-Path $root "app\Program.cs") -Raw
$j=Get-Content (Join-Path $root "app\wwwroot\app.js") -Raw
$markers=@(
  'CanAccessProvider(HttpContext ctx, ProviderStored p)',
  'CanAccessMediaLibrary(HttpContext ctx, MediaLibraryProvider p)',
  'ValidShareTargets',
  '/api/source-sharing/{kind}/{id}',
  'crossAccountSharing=false',
  'sharingScope="same-account-users-only"'
)
foreach($m in $markers){if(-not $p.Contains($m)){throw "Missing isolation marker: $m"}}
if(-not $j.Contains('openSourceSharing')){throw "Admin sharing UI missing"}
Write-Host "v30.1.0 source isolation markers verified." -ForegroundColor Green
