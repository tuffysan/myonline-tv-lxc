param(
    [string]$RepoPath = $PSScriptRoot,
    [string]$Remote = "origin",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Fail([string]$Message) {
    Write-Host ""
    Write-Host "ERROR: $Message" -ForegroundColor Red
    exit 1
}

function Run-Git {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
    & git @Args
    if ($LASTEXITCODE -ne 0) { throw "git $($Args -join ' ') failed." }
}

Write-Host "============================================================"
Write-Host " MyOnline TV - GitHub authentication + publish"
Write-Host "============================================================"

Set-Location $RepoPath

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fail "Git is not installed or is not available in PATH."
}

# Install GitHub CLI automatically when missing.
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "[1/6] GitHub CLI is missing. Installing with winget..."
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Fail "Neither GitHub CLI nor winget is available. Install GitHub CLI once, then run this script again."
    }

    winget install --id GitHub.cli --exact --source winget --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { Fail "GitHub CLI installation failed." }

    # winget may update PATH only for new processes. Add the standard path for this run.
    $ghDir = Join-Path $env:ProgramFiles "GitHub CLI"
    if (Test-Path $ghDir) {
        $env:PATH = "$ghDir;$env:PATH"
    }
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        Fail "GitHub CLI was installed but is not visible yet. Close this terminal, open a new one and run the CMD again."
    }
} else {
    Write-Host "[1/6] GitHub CLI found."
}

Write-Host "[2/6] Checking GitHub authentication..."
& gh auth status -h github.com *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "No valid GitHub login found."
    Write-Host "A GitHub browser/device login will now start. This is required only when credentials are missing/expired."
    & gh auth login -h github.com -p https -w
    if ($LASTEXITCODE -ne 0) { Fail "GitHub login failed." }
} else {
    Write-Host "GitHub authentication is valid."
}

Write-Host "[3/6] Configuring Git to use GitHub CLI credentials..."
& gh auth setup-git
if ($LASTEXITCODE -ne 0) { Fail "gh auth setup-git failed." }

Write-Host "[4/6] Verifying repository and remote..."
& git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) { Fail "This folder is not a Git repository." }

$remoteUrl = (& git remote get-url $Remote).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteUrl)) {
    Fail "Git remote '$Remote' was not found."
}
Write-Host "Remote: $remoteUrl"

$currentBranch = (& git branch --show-current).Trim()
if ($currentBranch -ne $Branch) {
    Fail "Current branch is '$currentBranch'. Expected '$Branch'."
}

Write-Host "[5/6] Testing authenticated GitHub access..."
& git ls-remote $Remote HEAD *> $null
if ($LASTEXITCODE -ne 0) {
    Fail "GitHub authentication still does not work for remote '$Remote'."
}
Write-Host "GitHub access verified."

Write-Host "[6/6] Resuming normal MyOnline TV release pipeline..."
$publish = Join-Path $RepoPath "PUBLISH.ps1"
if (-not (Test-Path $publish)) { Fail "PUBLISH.ps1 was not found." }

& powershell -NoProfile -ExecutionPolicy Bypass -File $publish -RepoPath $RepoPath -Remote $Remote -Branch $Branch
if ($LASTEXITCODE -ne 0) { Fail "PUBLISH.ps1 failed." }

Write-Host ""
Write-Host "============================================================"
Write-Host " v$(Get-Content (Join-Path $RepoPath 'VERSION') -Raw) published."
Write-Host " main and the release tag have been pushed to GitHub."
Write-Host " GitHub Actions will create the GitHub Release."
Write-Host "============================================================"
