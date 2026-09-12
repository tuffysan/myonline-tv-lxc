$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$program = Get-Content (Join-Path $root "app\Program.cs") -Raw
$discovery = Get-Content (Join-Path $root "app\LocalDiscoveryEngine.cs") -Raw
$version = (Get-Content (Join-Path $root "VERSION") -Raw).Trim()
$csproj = Get-Content (Join-Path $root "app\MyOnlineTV.Web.csproj") -Raw

if ($version -ne "34.0.1") { throw "VERSION is not 34.0.1" }
if (-not $csproj.Contains("<Version>34.0.1</Version>")) { throw "csproj version mismatch" }
foreach ($marker in @("using MyOnlineTV;", "ReleaseV3200.Capabilities()", "ReleaseV3300.Capabilities()", "ReleaseV3400.Capabilities()")) {
    if (-not $program.Contains($marker)) { throw "Missing marker: $marker" }
}
if ($program.Contains("x.Type, x.Enabled")) { throw "Invalid ProviderStored.Enabled access still present" }
if ($discovery.Contains("ExternalOptional")) { throw "External AI mode still present" }
if (-not $program.Contains("externalAiSupported = false")) { throw "External AI policy is not disabled" }

Write-Host "Static v34.0.1 checks passed." -ForegroundColor Green
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    Write-Host "Running dotnet build..."
    dotnet build (Join-Path $root "app\MyOnlineTV.Web.csproj") -c Release
    if ($LASTEXITCODE -ne 0) { throw "dotnet build failed" }
    Write-Host "dotnet build passed." -ForegroundColor Green
} else {
    Write-Warning "dotnet SDK not found; compile check skipped. PUBLISH.cmd will run it on the release machine."
}
