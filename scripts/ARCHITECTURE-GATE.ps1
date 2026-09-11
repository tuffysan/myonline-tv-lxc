$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$program=Get-Content (Join-Path $root "app\Program.cs") -Raw
if($program -notmatch "127\.0\.0\.1:5080"){throw "Expected Kestrel loopback missing"}
if($program -match "129\.0\.0\.1:5080"){throw "Invalid historical Kestrel address"}
Write-Host "Architecture gate passed." -ForegroundColor Green
