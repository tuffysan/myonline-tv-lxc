param(
  [string]$RepoPath = ".",
  [string]$Remote = "origin",
  [string]$Branch = "main",
  [int]$GitHubTimeoutMinutes = 20
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-Exit([string]$Message) {
  if ($LASTEXITCODE -ne 0) { throw $Message }
}
function Step([string]$Text) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host " $Text"
  Write-Host "============================================================"
}
function Invoke-DotNetReleaseTests {
  & dotnet run --project tests/ReleaseTests/ReleaseTests.csproj -c Release
  Assert-Exit "Release regression tests failed."
}
function Invoke-PSGate([string]$ScriptPath) {
  if ([string]::IsNullOrWhiteSpace($ScriptPath)) { throw "PowerShell gate path is empty." }
  $fullPath = Join-Path $repo $ScriptPath
  if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { throw "Required PowerShell gate missing: $ScriptPath" }
  Write-Host "Running PowerShell gate: $ScriptPath"
  & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $fullPath
  Assert-Exit "PowerShell gate failed: $ScriptPath"
}

Set-Location $RepoPath
$repo = (Get-Location).Path

foreach ($required in @('VERSION','release.json','PUBLISH.ps1','scripts/PRODUCTION-GATE-v30.ps1','tests/release_version.Tests.ps1','tests/ReleaseTests/ReleaseTests.csproj','tests/DownloadHeaders/DownloadHeaders.csproj')) {
  if (-not (Test-Path $required)) { throw "Required release file missing: $required" }
}
foreach ($command in @('git','dotnet','gh')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command is required and was not found in PATH." }
}

$version = (Get-Content VERSION -Raw).Trim()
$tag = "v$version"
$releaseInfo = Get-Content release.json -Raw | ConvertFrom-Json
if ([string]$releaseInfo.version -ne $version) { throw "VERSION ($version) and release.json ($($releaseInfo.version)) do not match." }
$expectedApp = "myonline-tv-web-v$version-linux-x64.tar.gz"
if ([string]$releaseInfo.artifact -ne $expectedApp) { throw "release.json artifact must be '$expectedApp'." }

$currentBranch = (& git branch --show-current).Trim()
Assert-Exit "Cannot determine current Git branch."
if ($currentBranch -ne $Branch) { throw "Current branch is '$currentBranch'; expected '$Branch'." }

Step "MyOnline TV $tag - LOCAL RELEASE GATE"
Write-Host "Repository : $repo"
Write-Host "Version    : $version"
Write-Host "Tag        : $tag"
Write-Host "Branch     : $Branch"

# Fail before doing expensive work if the immutable tag/release already exists.
& git fetch $Remote --tags
Assert-Exit "git fetch failed."
if ((@(& git tag --list $tag)).Count -gt 0) { throw "Local tag $tag already exists. Never overwrite release tags." }
& gh auth status --hostname github.com *> $null
Assert-Exit "GitHub CLI is not authenticated. Run 'gh auth login' first."
$remoteTag = @(& git ls-remote --tags $Remote "refs/tags/$tag")
Assert-Exit "Could not inspect remote tags."
if ($remoteTag.Count -gt 0) { throw "Remote tag $tag already exists. Never overwrite release tags." }

. (Join-Path $PSScriptRoot 'scripts/Release-VersionGuard.ps1')
$knownTags = @(& git tag --list)
Assert-Exit "Cannot inspect existing tags."
# Ask gh to project only tag names. This avoids depending on the JSON shape
# produced by --paginate/--slurp (which can be nested arrays).
$publishedTags = @(& gh api --paginate "repos/{owner}/{repo}/releases?per_page=100" --jq '.[].tag_name')
Assert-Exit "Cannot inspect GitHub Releases."
$publishedTags = @($publishedTags | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
Assert-ReleaseVersion $version ($knownTags + $publishedTags)

Step "[0/7] Dependency policy gate"
Write-Host 'Scanning build/test/release/deployment/update scripts for forbidden runtime dependencies...'
$forbiddenRuntimeTokens = @(
  ('py' + 'thon3'),
  ('py' + 'thon.exe'),
  ('py' + 'thon3.exe'),
  ('p' + 'y.exe'),
  ('p' + 'ip3'),
  ('p' + 'ip.exe')
)
$scriptFiles = @(Get-ChildItem -Path $repo -Recurse -File -Include *.ps1,*.cmd,*.sh,*.yml,*.yaml | Where-Object { $_.FullName -notmatch '[\\/]bin[\\/]|[\\/]obj[\\/]|[\\/]node_modules[\\/]' })
$dependencyHits = foreach ($file in $scriptFiles) {
  foreach ($token in $forbiddenRuntimeTokens) {
    foreach ($match in @(Select-String -LiteralPath $file.FullName -SimpleMatch $token -ErrorAction SilentlyContinue)) {
      [PSCustomObject]@{ File=$file.FullName.Substring($repo.Length).TrimStart('\','/'); Line=$match.LineNumber; Text=$match.Line.Trim() }
    }
  }
}
if ($dependencyHits) {
  $dependencyHits | Sort-Object File,Line -Unique | Format-Table -AutoSize | Out-Host
  throw 'Forbidden runtime dependency detected. MyOnlineTV distribution tooling must remain .NET/PowerShell/POSIX-shell only.'
}
Write-Host 'PASS: distribution tooling has no forbidden runtime dependency.'

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
  Write-Host 'Checking frontend JavaScript syntax with Node.js...'
  & node --check app/wwwroot/app.js
  Assert-Exit "Frontend JavaScript syntax validation failed. Fix app/wwwroot/app.js before release."
  Write-Host 'PASS: frontend JavaScript syntax validation.'
} else {
  Write-Host 'SKIP: Node.js is not installed locally. Frontend syntax validation remains mandatory in GitHub Actions.'
}

Step "[1/7] Restore and Release build"
& dotnet restore app/MyOnlineTV.Web.csproj
Assert-Exit "dotnet restore failed."
& dotnet build app/MyOnlineTV.Web.csproj -c Release --no-restore
Assert-Exit "Release build failed."

Step "[2/7] Download header regression tests"
& dotnet run --project tests/DownloadHeaders/DownloadHeaders.csproj -c Release
Assert-Exit "DownloadHeaders tests failed."

Step "[3/7] .NET application regression tests"
Invoke-DotNetReleaseTests

Step "[4/7] Security static gates"
Invoke-PSGate 'tests/security_static.Tests.ps1'
Invoke-PSGate 'tests/source_regression.Tests.ps1' 

Step "[5/7] Version and production gates"
& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File tests/release_version.Tests.ps1
Assert-Exit "Release version tests failed."
& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File scripts/PRODUCTION-GATE-v30.ps1
Assert-Exit "Production gate failed."

Step "[6/7] Commit, push and create immutable release tag"
# PUBLISH.ps1 performs a second build preflight, stages the intended working tree,
# commits it when needed, pushes main, rechecks tag collisions, and pushes the tag.
& powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File PUBLISH.ps1 -RepoPath $repo -Remote $Remote -Branch $Branch
Assert-Exit "PUBLISH.ps1 failed. GitHub release was not completed."

$headSha = (& git rev-parse HEAD).Trim()
Assert-Exit "Cannot determine released commit SHA."
$tagSha = (& git rev-list -n 1 $tag).Trim()
Assert-Exit "Cannot resolve release tag."
if ($headSha -ne $tagSha) { throw "$tag does not point at current HEAD. HEAD=$headSha tag=$tagSha" }

Step "[7/7] Wait for GitHub Actions and verify GitHub Release"
$deadline = (Get-Date).AddMinutes($GitHubTimeoutMinutes)
$runId = $null
while (-not $runId -and (Get-Date) -lt $deadline) {
  $runsRaw = & gh run list --workflow release.yml --event push --limit 30 --json databaseId,headBranch,headSha,status,conclusion
  Assert-Exit "Could not query GitHub Actions."
  $runs = @($runsRaw | ConvertFrom-Json)
  $match = $runs | Where-Object { $_.headBranch -eq $tag -and $_.headSha -eq $headSha } | Select-Object -First 1
  if ($match) { $runId = [string]$match.databaseId; break }
  Write-Host "Waiting for GitHub Actions run for $tag..."
  Start-Sleep -Seconds 5
}
if (-not $runId) { throw "Timed out waiting for GitHub Actions run for $tag." }
Write-Host "GitHub Actions run: $runId"

$actionStarted = Get-Date
$lastActionLine = ""
while ((Get-Date) -lt $deadline) {
  $runRaw = & gh run view $runId --json status,conclusion,url,jobs
  Assert-Exit "Could not inspect GitHub Actions run $runId."
  $run = $runRaw | ConvertFrom-Json
  $activeJob = @($run.jobs | Where-Object { $_.status -ne 'completed' } | Select-Object -First 1)
  if (-not $activeJob) { $activeJob = @($run.jobs | Select-Object -Last 1) }
  $job = if ($activeJob.Count) { $activeJob[0] } else { $null }
  $activeStep = $null
  if ($job) {
    $activeStep = @($job.steps | Where-Object { $_.status -eq 'in_progress' } | Select-Object -First 1)
    if (-not $activeStep) { $activeStep = @($job.steps | Where-Object { $_.status -eq 'queued' } | Select-Object -First 1) }
    if (-not $activeStep) { $activeStep = @($job.steps | Select-Object -Last 1) }
    if ($activeStep.Count) { $activeStep = $activeStep[0] } else { $activeStep = $null }
  }
  $elapsed = (Get-Date) - $actionStarted
  $jobName = if ($job) { [string]$job.name } else { 'Waiting for job' }
  $stepName = if ($activeStep) { [string]$activeStep.name } else { [string]$run.status }
  $line = "[{0:mm\:ss}] Job: {1} | Step: {2} | Run: {3}" -f $elapsed,$jobName,$stepName,$run.status
  if ($line -ne $lastActionLine) { Write-Host $line; $lastActionLine = $line }
  if ($run.status -eq 'completed') {
    if ($run.conclusion -ne 'success') {
      Write-Host "GitHub Actions failed. Showing failed log output:"
      & gh run view $runId --log-failed
      throw "GitHub Actions release failed: $($run.url)"
    }
    break
  }
  Start-Sleep -Seconds 5
}
if ((Get-Date) -ge $deadline) { throw "Timed out waiting for GitHub Actions release to finish." }

$releaseRaw = & gh api "repos/{owner}/{repo}/releases/tags/$tag"
Assert-Exit "GitHub Release $tag was not found."
$release = $releaseRaw | ConvertFrom-Json
if ($release.draft -or $release.prerelease) { throw "GitHub Release exists but is draft/prerelease." }

$requiredAssets = @(
  $expectedApp,
  "myonline-tv-lxc-v$version-source.tar.gz",
  "SHA256SUMS-RELEASE.txt",
  "release.json"
)
foreach ($assetName in $requiredAssets) {
  $matches = @($release.assets | Where-Object { $_.name -eq $assetName -and [int64]$_.size -gt 0 })
  if ($matches.Count -ne 1) { throw "Mandatory GitHub Release asset missing/empty/duplicated: $assetName" }
  Write-Host "PASS asset: $assetName ($($matches[0].size) bytes)"
}

Write-Host ""
Write-Host "============================================================"
Write-Host " MyOnlineTV $tag RELEASE SUCCESSFUL"
Write-Host "============================================================"
Write-Host "Commit        : $headSha"
Write-Host "GitHub Actions: PASS (run $runId)"
Write-Host "GitHub Release: $($release.html_url)"
Write-Host "Artifacts     : PASS"
Write-Host "============================================================"
