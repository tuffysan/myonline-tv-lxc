param(
  [string]$RepoPath = ".",
  [string]$Remote = "origin",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

Write-Host "[LOCAL BUILD PREFLIGHT] Checking .NET build when SDK is available..."
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if ($dotnet) {
    dotnet restore app/MyOnlineTV.Web.csproj
    if ($LASTEXITCODE -ne 0) { throw "dotnet restore failed. Release not published." }
    dotnet build app/MyOnlineTV.Web.csproj -c Release --no-restore
    if ($LASTEXITCODE -ne 0) { throw "dotnet build failed. Release not published." }
} else {
    Write-Warning ".NET SDK not found locally; GitHub Actions will perform the compile gate."
}

Set-Location $RepoPath

if (-not (Test-Path "VERSION")) { throw "VERSION file was not found in repository root." }
$version = (Get-Content VERSION -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$') {
  throw "VERSION '$version' is not a valid release version."
}
$tag = "v$version"

Write-Host "============================================================"
Write-Host " MyOnline TV Publish"
Write-Host "============================================================"
Write-Host "Repository: $(Get-Location)"
Write-Host "Version   : $version"
Write-Host "Tag       : $tag"
Write-Host ""

git rev-parse --is-inside-work-tree | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Current directory is not a Git repository." }

$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne $Branch) {
  throw "Current branch is '$currentBranch'. Switch to '$Branch' before publishing."
}

Write-Host "[1/8] Checking repository..."
git fetch $Remote --tags
if ($LASTEXITCODE -ne 0) { throw "git fetch failed." }

Write-Host "[2/8] Adding files..."
git add -A
if ($LASTEXITCODE -ne 0) { throw "git add failed." }

Write-Host "[3/8] Commit..."
$staged = git diff --cached --name-only
if ($staged) {
  git commit -m "v$version"
  if ($LASTEXITCODE -ne 0) { throw "git commit failed." }
} else {
  Write-Host "No staged changes; current commit will be released."
}

Write-Host "[4/8] Push $Branch..."
git push $Remote $Branch
if ($LASTEXITCODE -ne 0) { throw "git push failed." }

Write-Host "[5/8] Checking existing local tag..."
if (git tag --list $tag) {
  $localCommit = (git rev-list -n 1 $tag).Trim()
  $headCommit = (git rev-parse HEAD).Trim()
  if ($localCommit -ne $headCommit) {
    Write-Host "Local tag points to an older commit; recreating it."
    git tag -d $tag | Out-Null
  } else {
    Write-Host "Local tag already points to HEAD."
  }
}

Write-Host "[6/8] Checking existing remote tag..."
$remoteTag = git ls-remote --tags $Remote "refs/tags/$tag"
if ($remoteTag) {
  $remoteCommit = (($remoteTag -split '\s+')[0]).Trim()
  $headCommit = (git rev-parse HEAD).Trim()
  if ($remoteCommit -eq $headCommit) {
    Write-Host "Remote tag already points to HEAD; nothing to recreate."
  } else {
    Write-Host "Remote tag exists on another commit; deleting it first."
    git push $Remote ":refs/tags/$tag"
    if ($LASTEXITCODE -ne 0) { throw "Could not delete remote tag $tag." }
  }
}

Write-Host "[7/8] Create tag when needed..."
if (-not (git tag --list $tag)) {
  git tag $tag
  if ($LASTEXITCODE -ne 0) { throw "Could not create tag $tag." }
}

Write-Host "[8/8] Push tag..."
git push $Remote $tag
if ($LASTEXITCODE -ne 0) { throw "Could not push tag $tag." }

Write-Host ""
Write-Host "Publish complete."
Write-Host "GitHub Actions should now build release $tag."
