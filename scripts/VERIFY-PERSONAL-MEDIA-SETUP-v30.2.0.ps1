\
$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$p=Get-Content (Join-Path $root 'app\Program.cs') -Raw
$j=Get-Content (Join-Path $root 'app\wwwroot\app.js') -Raw
foreach($m in @('/api/onboarding/test/iptv','/api/onboarding/test/media','/api/onboarding/summary','StatusCodes.Status404NotFound')){if(-not $p.Contains($m)){throw "Missing: $m"}}
foreach($m in @('What do you want to use?','Test & save','obChooseLibraries','Run setup guide','No personal sources yet')){if(-not $j.Contains($m)){throw "Missing UI: $m"}}
Write-Host 'v31.1.2 Personal Media Setup markers verified.' -ForegroundColor Green
