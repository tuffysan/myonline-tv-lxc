param(
  [string]$RepoPath = ".",
  [string]$Remote = "origin",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
Set-Location $RepoPath

$version = (Get-Content VERSION -Raw).Trim()
if ($version -ne "0.5.3") {
  throw "VERSION is '$version' but this script expects 0.5.3."
}
$tag = "v$version"

Write-Host "Repository: $(Get-Location)"
Write-Host "Version   : $version"
Write-Host "Tag       : $tag"

git rev-parse --is-inside-work-tree | Out-Null

Write-Host "[1/7] Checking working tree..."
$status = git status --porcelain
if ($status) {
  Write-Host "Changes detected - they will be committed."
}

Write-Host "[2/7] Adding files..."
git add -A

Write-Host "[3/7] Commit..."
$staged = git diff --cached --name-only
if ($staged) {
  git commit -m "v$version"
} else {
  Write-Host "No staged changes; using current commit."
}

Write-Host "[4/7] Push branch..."
git push $Remote $Branch

Write-Host "[5/7] Recreate local tag if needed..."
if (git tag --list $tag) {
  git tag -d $tag
}
Write-Host "[6/7] Remove remote tag if needed..."
git push $Remote ":refs/tags/$tag" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Remote tag did not exist, continuing."
  $global:LASTEXITCODE = 0
}

Write-Host "[7/7] Create and push tag..."
git tag $tag
git push $Remote $tag

Write-Host ""
Write-Host "Done. GitHub Actions should now build and publish release $tag."
Write-Host "Check: https://github.com/tuffysan/myonline-tv-lxc/actions"
