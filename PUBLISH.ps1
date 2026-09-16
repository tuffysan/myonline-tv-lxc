param(
  [string]$RepoPath = ".",
  [string]$Remote = "origin",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-LastExitCode([string]$Message) {
  if ($LASTEXITCODE -ne 0) { throw $Message }
}

function Ensure-GitHubCli {
  if (Get-Command gh -ErrorAction SilentlyContinue) { return }

  Write-Host "[AUTH] GitHub CLI (gh) not found. Installing..."
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "GitHub CLI is required and winget is not available. Install GitHub CLI once and run PUBLISH.cmd again."
  }

  & winget install --id GitHub.cli --exact --source winget --accept-package-agreements --accept-source-agreements
  Assert-LastExitCode "Could not install GitHub CLI."

  $ghDir = Join-Path $env:ProgramFiles "GitHub CLI"
  if (Test-Path $ghDir) { $env:PATH = "$ghDir;$env:PATH" }
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI was installed but is not available in this process. Open a new terminal and run PUBLISH.cmd again."
  }
}

function Ensure-GitHubAuthentication {
  Write-Host "[AUTH] Checking GitHub authentication..."
  Ensure-GitHubCli

  & gh auth status --hostname github.com *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[AUTH] No valid GitHub login. Opening GitHub login..."
    & gh auth login --hostname github.com --git-protocol https --web
    Assert-LastExitCode "GitHub authentication failed."
  }

  # Make Git use the same credential that gh has verified. This replaces stale
  # HTTPS credentials without storing a PAT in this repository or script.
  Write-Host "[AUTH] Configuring Git credential helper from GitHub CLI..."
  & gh auth setup-git --hostname github.com --force
  Assert-LastExitCode "Could not configure Git to use GitHub CLI authentication."

  Write-Host "[AUTH] Verifying access to '$Remote'..."
  & git ls-remote $Remote HEAD *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[AUTH] Credential test failed. Refreshing GitHub login..."
    & gh auth logout --hostname github.com 2>$null
    & gh auth login --hostname github.com --git-protocol https --web
    Assert-LastExitCode "GitHub re-authentication failed."
    & gh auth setup-git --hostname github.com --force
    Assert-LastExitCode "Could not reconfigure Git authentication."
    & git ls-remote $Remote HEAD *> $null
    Assert-LastExitCode "GitHub authentication is still failing for '$Remote'."
  }

  Write-Host "[AUTH] GitHub authentication OK."
}

Set-Location $RepoPath

if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git is not installed or not in PATH." }
if (-not (Test-Path "VERSION")) { throw "VERSION file was not found in repository root." }
if (-not (Test-Path "app/MyOnlineTV.Web.csproj")) { throw "app/MyOnlineTV.Web.csproj was not found." }

$version = (Get-Content VERSION -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') { throw "VERSION '$version' is not valid." }
$tag = "v$version"

Write-Host "============================================================"
Write-Host " MyOnline TV Publish"
Write-Host "============================================================"
Write-Host "Repository: $(Get-Location)"
Write-Host "Version   : $version"
Write-Host "Tag       : $tag"
Write-Host ""

& git rev-parse --is-inside-work-tree *> $null
Assert-LastExitCode "Current directory is not a Git repository."
$currentBranch = (& git branch --show-current).Trim()
if ($currentBranch -ne $Branch) { throw "Current branch is '$currentBranch'. Expected '$Branch'." }

# Authenticate BEFORE fetch/push so stale Windows credentials cannot break the release halfway through.
Ensure-GitHubAuthentication

Write-Host "[1/9] Fetching repository..."
& git fetch $Remote --tags
Assert-LastExitCode "git fetch failed."

Write-Host "[2/9] Local .NET build preflight..."
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if ($dotnet) {
  & dotnet restore app/MyOnlineTV.Web.csproj
  Assert-LastExitCode "dotnet restore failed. Release not published."
  & dotnet build app/MyOnlineTV.Web.csproj -c Release --no-restore
  Assert-LastExitCode "dotnet build failed. Release not published."
} else {
  Write-Warning ".NET SDK not found locally; GitHub Actions will perform the compile gate."
}

Write-Host "[3/9] Adding files..."
& git add -A
Assert-LastExitCode "git add failed."

Write-Host "[4/9] Commit..."
$staged = @(& git diff --cached --name-only)
if ($staged.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace(($staged -join ''))) {
  & git commit -m "v$version"
  Assert-LastExitCode "git commit failed."
} else {
  Write-Host "No staged changes; current commit will be released."
}

Write-Host "[5/9] Push $Branch..."
& git push $Remote "HEAD:$Branch"
Assert-LastExitCode "git push failed even though authentication preflight succeeded."

$headCommit = (& git rev-parse HEAD).Trim()

Write-Host "[6/9] Checking local tag..."
$localTag = (& git tag --list $tag).Trim()
if ($localTag) {
  $localCommit = (& git rev-list -n 1 $tag).Trim()
  if ($localCommit -ne $headCommit) {
    Write-Host "Local $tag points to an older commit; recreating it."
    & git tag -d $tag | Out-Null
    Assert-LastExitCode "Could not delete old local tag $tag."
  }
}

Write-Host "[7/9] Checking remote tag..."
$remoteTagLine = (& git ls-remote --tags $Remote "refs/tags/$tag").Trim()
if ($remoteTagLine) {
  $remoteCommit = (($remoteTagLine -split '\s+')[0]).Trim()
  if ($remoteCommit -ne $headCommit) {
    Write-Host "Remote $tag points to another commit; replacing it."
    & git push $Remote ":refs/tags/$tag"
    Assert-LastExitCode "Could not delete old remote tag $tag."
  } else {
    Write-Host "Remote $tag already points to HEAD."
  }
}

Write-Host "[8/9] Creating tag when needed..."
if (-not ((& git tag --list $tag).Trim())) {
  & git tag -a $tag -m "MyOnline TV $tag"
  Assert-LastExitCode "Could not create tag $tag."
}

Write-Host "[9/9] Push tag..."
& git push $Remote "refs/tags/$tag"
Assert-LastExitCode "Could not push tag $tag."

Write-Host ""
Write-Host "============================================================"
Write-Host " Publish complete: $tag"
Write-Host " main and $tag are now on GitHub."
Write-Host " GitHub Actions will build and create the GitHub Release."
Write-Host "============================================================"
