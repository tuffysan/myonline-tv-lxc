param([switch]$Strict)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$expected = "33.0.0"
$fail = @()
function Check([bool]$ok,[string]$name) { if($ok){Write-Host "[OK]   $name" -ForegroundColor Green}else{$script:fail += $name; Write-Host "[FAIL] $name" -ForegroundColor Red} }
Check ((Get-Content (Join-Path $root 'VERSION') -Raw).Trim() -eq $expected) "VERSION is $expected"
$release = Get-Content (Join-Path $root 'release.json') -Raw | ConvertFrom-Json
Check ($release.version -eq $expected) "release.json version"
$proj = Get-Content (Join-Path $root 'app/MyOnlineTV.Web.csproj') -Raw
Check ($proj -match "<Version>$([regex]::Escape($expected))</Version>") ".csproj version"
$program = Get-Content (Join-Path $root 'app/Program.cs') -Raw
Check ($program -match [regex]::Escape('/api/v33/')) "release API endpoint present"
$js = Get-Content (Join-Path $root 'app/wwwroot/app.js') -Raw
Check ($js -match [regex]::Escape("version:'$expected'")) "web release marker"
if(Get-Command dotnet -ErrorAction SilentlyContinue){
  Push-Location (Join-Path $root 'app')
  try { dotnet build -c Release; Check ($LASTEXITCODE -eq 0) "dotnet build" } finally { Pop-Location }
} else { Write-Host '[INFO] dotnet not installed; build check skipped.' -ForegroundColor Yellow; if($Strict){$fail += 'dotnet unavailable'} }
if($fail.Count){Write-Host "Verification failed: $($fail -join ', ')" -ForegroundColor Red; exit 1}
Write-Host 'Verification passed.' -ForegroundColor Green
