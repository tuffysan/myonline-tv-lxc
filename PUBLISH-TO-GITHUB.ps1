$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$Repo = 'tuffysan/viking-iptv-lxc'
$Branch = 'main'
$Version = (Get-Content "$PSScriptRoot\VERSION" -Raw).Trim()

function Require-Command([string]$Name, [string]$InstallHint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name saknas. $InstallHint"
    }
}

Write-Host "=== Viking IPTV v$Version - GitHub publish ===" -ForegroundColor Cyan
Require-Command git 'Installera Git for Windows: winget install --id Git.Git -e'
Require-Command gh  'Installera GitHub CLI: winget install --id GitHub.cli -e'

Write-Host '[1/7] Kontrollerar GitHub-autentisering...'
try {
    gh auth status 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'auth failed' }
}
catch {
    Write-Host ''
    Write-Host 'GitHub CLI är inte autentiserad.' -ForegroundColor Yellow
    if ($env:GITHUB_TOKEN) {
        throw 'GITHUB_TOKEN finns men accepterades inte av GitHub CLI. Kontrollera tokenens behörigheter eller rensa variabeln och kör: gh auth login'
    }
    throw 'Kör: gh auth login'
}

Write-Host '[2/7] Verifierar projektversion...'
$Project = "$PSScriptRoot\app\VikingIptv.csproj"
if (-not (Test-Path $Project)) { throw "Saknar $Project" }
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    dotnet build $Project -c Release --nologo
    if ($LASTEXITCODE -ne 0) { throw 'dotnet build misslyckades.' }
} else {
    Write-Host 'INFO: .NET SDK saknas lokalt. Build hoppas över; LXC-installern bygger i Debian.' -ForegroundColor Yellow
}

Write-Host '[3/7] Förbereder Git repository...'
if (-not (Test-Path '.git')) { git init | Out-Host }
git checkout -B $Branch | Out-Host

# Ensure Git identity exists before committing.
$userName = (git config user.name 2>$null)
$userEmail = (git config user.email 2>$null)
if (-not $userName) { git config user.name 'tuffysan' }
if (-not $userEmail) {
    $login = (gh api user --jq .login 2>$null)
    if (-not $login) { $login = 'tuffysan' }
    git config user.email "$login@users.noreply.github.com"
}

git add -A
$staged = git diff --cached --name-only
if ($staged) {
    git commit -m "Viking IPTV v$Version" | Out-Host
} else {
    Write-Host 'Inga nya filändringar att committa.'
}

Write-Host '[4/7] Kontrollerar GitHub repository...'
gh repo view $Repo *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Skapar publikt repository $Repo..."
    gh repo create $Repo --public --source=. --remote=origin
    if ($LASTEXITCODE -ne 0) { throw 'Kunde inte skapa GitHub repository.' }
} else {
    $remoteExists = git remote 2>$null | Where-Object { $_ -eq 'origin' }
    if ($remoteExists) {
        git remote set-url origin "https://github.com/$Repo.git"
    } else {
        git remote add origin "https://github.com/$Repo.git"
    }
}

Write-Host '[5/7] Pushar main...'
git push -u origin $Branch
if ($LASTEXITCODE -ne 0) { throw 'Push av main misslyckades.' }

Write-Host "[6/7] Skapar tag v$Version..."
git tag -f "v$Version"
git push origin "v$Version" --force
if ($LASTEXITCODE -ne 0) { throw 'Push av versionstaggen misslyckades.' }

Write-Host '[7/7] Klart.' -ForegroundColor Green
Write-Host "Repository: https://github.com/$Repo"
Write-Host ''
Write-Host 'Installera LXC på Proxmox som root med:' -ForegroundColor Cyan
Write-Host "bash -c `"`$(curl -fsSL https://raw.githubusercontent.com/$Repo/$Branch/install-lxc.sh)`""
