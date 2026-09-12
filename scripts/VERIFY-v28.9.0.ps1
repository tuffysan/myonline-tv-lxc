$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
Write-Host "MyOnline TV v30.2.0 - DVR Production" -ForegroundColor Cyan
$required=@("VERSION","PUBLISH.cmd","PUBLISH.ps1","app\Program.cs","app\wwwroot\app.js","app\wwwroot\styles.css")
$missing=@($required|Where-Object{-not(Test-Path(Join-Path $root $_))})
if($missing){throw "Missing files: $($missing -join ', ')"}
$version=(Get-Content (Join-Path $root "VERSION") -Raw).Trim()
if($version -ne "30.2.0"){throw "VERSION mismatch: $version"}
$program=Get-Content (Join-Path $root "app\Program.cs") -Raw
if($program -notmatch "127\.0\.0\.1:5080"){throw "Kestrel loopback missing"}
if($program -match "129\.0\.0\.1:5080"){throw "Historical Kestrel regression"}
Write-Host "Static release gate passed." -ForegroundColor Green
