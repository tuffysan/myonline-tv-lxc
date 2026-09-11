$ErrorActionPreference="Stop"
$root=Split-Path -Parent $PSScriptRoot
$required=@(
  "app\Program.cs","app\wwwroot\app.js","app\wwwroot\styles.css",
  "PUBLISH.cmd","PUBLISH.ps1","VERSION"
)
$missing=@($required | Where-Object { -not (Test-Path (Join-Path $root $_)) })
if($missing.Count){ throw "Missing required files: $($missing -join ', ')" }
$program=Get-Content (Join-Path $root "app\Program.cs") -Raw
if($program -match "129\.0\.0\.1:5080"){ throw "Invalid Kestrel loopback address detected." }
if($program -notmatch "127\.0\.0\.1:5080"){ throw "Expected Kestrel loopback address not found." }
Write-Host "Architecture validation passed." -ForegroundColor Green
