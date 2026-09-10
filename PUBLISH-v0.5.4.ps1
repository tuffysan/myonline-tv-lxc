param(
  [string]$RepoPath = ".",
  [string]$Remote = "origin",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
Set-Location $RepoPath

$version = (Get-Content VERSION -Raw).Trim()
if ($version -ne "0.5.4") { throw "VERSION is '$version' but this script expects 0.5.4." }
$tag = "v$version"

Write-Host "Repository: $(Get-Location)"
Write-Host "Version   : $version"
Write-Host "Tag       : $tag"

git rev-parse --is-inside-work-tree | Out-Null

Write-Host "[1/7] Checking working tree..."
$status = git status --porcelain
if ($status) { Write-Host "Changes detected - they will be committed." }

Write-Host "[2/7] Adding files..."
git add -A

Write-Host "[3/7] Commit..."
$staged = git diff --cached --name-only
if ($staged) {
  git commit -m "v$version"
  if ($LASTEXITCODE -ne 0) { throw "git commit failed." }
} else {
  Write-Host "No staged changes; using current commit."
}

Write-Host "[4/7] Push branch..."
git push $Remote $Branch
if ($LASTEXITCODE -ne 0) { throw "git push failed." }

Write-Host "[5/7] Recreate local tag if needed..."
if (git tag --list $tag) { git tag -d $tag | Out-Null }

Write-Host "[6/7] Remove remote tag if needed..."
$remoteTag = git ls-remote --tags $Remote "refs/tags/$tag"
if ($remoteTag) {
  git push $Remote ":refs/tags/$tag"
  if ($LASTEXITCODE -ne 0) { throw "Could not delete existing remote tag $tag." }
} else {
  Write-Host "Remote tag does not exist - continuing."
}

Write-Host "[7/7] Create and push tag..."
git tag $tag
if ($LASTEXITCODE -ne 0) { throw "Could not create tag $tag." }
git push $Remote $tag
if ($LASTEXITCODE -ne 0) { throw "Could not push tag $tag." }

Write-Host ""
Write-Host "Done. GitHub Actions should now build and publish release $tag."
