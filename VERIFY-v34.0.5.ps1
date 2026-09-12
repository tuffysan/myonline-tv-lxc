$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$program = Join-Path $root "app\Program.cs"
$project = Join-Path $root "app\MyOnlineTV.Web.csproj"
if ((Get-Content (Join-Path $root "VERSION") -Raw).Trim() -ne "34.0.5") { throw "VERSION mismatch" }
if (-not (Select-String -Path $project -SimpleMatch "<Version>34.0.5</Version>" -Quiet)) { throw "csproj version mismatch" }
if ((Get-Content (Join-Path $root "release.json") -Raw | ConvertFrom-Json).version -ne "34.0.5") { throw "release.json version mismatch" }
$code = Get-Content $program -Raw
foreach ($required in @("ProviderTextWithRetry", "IsTransientProviderException", "TryLoadLiveChannelDiskCache", "/api/iptv/transport/capabilities", "MyOnline-TV/34.0.5")) { if (-not $code.Contains($required)) { throw "Missing transport feature: $required" } }
if ($code.Contains('MyOnline-TV/28.0.0')) { throw "Legacy IPTV user-agent remains" }
Write-Host "Static v34.0.5 transport-resilience checks passed." -ForegroundColor Green
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnet) { throw "dotnet SDK is required for verification" }
Write-Host "Running warning-free dotnet build..." -ForegroundColor Cyan
$out = & dotnet build $project -c Release 2>&1 | Out-String
Write-Host $out
if ($LASTEXITCODE -ne 0) { throw "dotnet build failed" }
if ($out -match '(?im)^.*warning [A-Z]+\d+:') { throw "dotnet build succeeded but compiler warnings remain" }
Write-Host "v34.0.5 verified: build passed with zero compiler warnings." -ForegroundColor Green
