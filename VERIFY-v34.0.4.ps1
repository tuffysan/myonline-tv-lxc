$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$program = Join-Path $root "app\Program.cs"
$csproj = Join-Path $root "app\MyOnlineTV.Web.csproj"
$versionFile = Join-Path $root "VERSION"
$releaseJson = Join-Path $root "release.json"

$version = (Get-Content $versionFile -Raw).Trim()
$csprojText = Get-Content $csproj -Raw
$programText = Get-Content $program -Raw
$release = Get-Content $releaseJson -Raw | ConvertFrom-Json

if ($version -ne "34.0.4") { throw "VERSION is not 34.0.4" }
if (-not $csprojText.Contains("<Version>34.0.4</Version>")) { throw "csproj version mismatch" }
if ($release.version -ne "34.0.4") { throw "release.json version mismatch" }
if ($programText.Contains("KnownNetworks.Clear()")) { throw "Obsolete KnownNetworks usage still present" }
if (-not $programText.Contains("KnownIPNetworks.Clear()")) { throw "KnownIPNetworks cleanup missing" }

$deadFunctions = @(
    "ValidShareTargets(",
    "PlexHeaders(",
    "FeatureAllowed(",
    "ProxyArtwork(",
    "BuildXtreamM3uUrl(",
    "SameAccount(",
    "ProfileAllowedForUser("
)
foreach ($name in $deadFunctions) {
    if ($programText.Contains($name)) { throw "Unused function still present: $name" }
}

$paidAiMarkers = @("api.openai.com", "api.anthropic.com", "generativelanguage.googleapis.com")
foreach ($marker in $paidAiMarkers) {
    if ($programText.Contains($marker)) { throw "Paid AI runtime dependency marker found: $marker" }
}

Write-Host "Static v34.0.4 cleanup checks passed." -ForegroundColor Green

$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if ($null -eq $dotnet) {
    Write-Warning "dotnet SDK not found; build check skipped."
    exit 0
}

Write-Host "Running warning-free dotnet build..." -ForegroundColor Cyan
$buildOutput = & dotnet build $csproj -c Release --nologo 2>&1 | Out-String
Write-Host $buildOutput
if ($LASTEXITCODE -ne 0) { throw "dotnet build failed" }

if ($buildOutput -match '(?im)\bwarning\s+[A-Z]{2,}[0-9]+\s*:') {
    throw "dotnet build succeeded but compiler warnings remain"
}
if ($buildOutput -match '(?im)Build succeeded with\s+([1-9][0-9]*)\s+warning') {
    throw "dotnet build succeeded but warnings remain"
}

Write-Host "v34.0.4 verified: build passed with zero compiler warnings." -ForegroundColor Green
