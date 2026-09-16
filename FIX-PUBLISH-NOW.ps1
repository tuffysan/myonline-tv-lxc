$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Run-Git([string[]]$Args, [string]$ErrorMessage) {
  & git @Args
  if ($LASTEXITCODE -ne 0) { throw $ErrorMessage }
}

if (-not (Test-Path '.git')) { throw 'Run this from the repository root.' }
if (-not (Test-Path 'PUBLISH.cmd')) { throw 'PUBLISH.cmd not found. Run this from the MyOnline TV repository root.' }

Write-Host '============================================================'
Write-Host ' MyOnline TV - repair local release history and publish'
Write-Host '============================================================'

Write-Host '[1/7] Fetching origin/main...'
Run-Git @('fetch','origin','main','--tags') 'git fetch failed.'

$branch = (@(& git branch --show-current) -join '').Trim()
if ($branch -ne 'main') { throw "Current branch is '$branch'. Expected 'main'." }

# Preserve the complete working tree + index state, then rebuild all commits that
# have not reached origin/main. This removes the workflow-file commit that GitHub
# refuses when the current PAT has no workflow scope, without losing app changes.
Write-Host '[2/7] Squashing unpushed work onto origin/main...'
Run-Git @('reset','--soft','origin/main') 'Could not reset local unpublished history onto origin/main.'

Write-Host '[3/7] Restoring GitHub workflows exactly from origin/main...'
Run-Git @('restore','--source=origin/main','--staged','--worktree','--','.github/workflows') 'Could not restore workflows from origin/main.'

Write-Host '[4/7] Removing stale hard-coded product versions from Program.cs...'
$program = 'app/Program.cs'
if (-not (Test-Path $program)) { throw "$program not found." }
$text = Get-Content $program -Raw
$before = $text
# The deployment gate rejects anonymous/object properties such as version = "34.x.y".
$text = [regex]::Replace($text, '(?i)\bversion\s*=\s*"34\.\d+\.\d+"', 'version = appVersion')
# Keep the HTTP User-Agent tied to the running build as well.
$text = [regex]::Replace($text, 'MyOnline-TV-Web/34\.\d+\.\d+', 'MyOnline-TV-Web/' + '${appVersion}')
if ($text -ne $before) {
  Set-Content -Path $program -Value $text -Encoding utf8
  Write-Host '      Program.cs version literals corrected.'
} else {
  Write-Host '      No matching 34.x product-version literal remained in Program.cs.'
}

Write-Host '[5/7] Verifying no workflow change will be pushed...'
Run-Git @('add','-A') 'git add failed.'
$workflowDiff = @(& git diff --cached --name-only -- '.github/workflows')
if ($workflowDiff.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace(($workflowDiff -join ''))) {
  throw "Workflow files are still staged. Refusing to publish: $($workflowDiff -join ', ')"
}

Write-Host '[6/7] Creating clean v35.0.3 commit...'
$staged = @(& git diff --cached --name-only)
if ($staged.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace(($staged -join ''))) {
  Run-Git @('commit','-m','v35.0.3') 'Could not create clean v35.0.3 commit.'
} else {
  Write-Host '      No unpublished file changes remain; continuing.'
}

Write-Host '[7/7] Running normal PUBLISH.cmd...'
& .\PUBLISH.cmd
if ($LASTEXITCODE -ne 0) { throw "PUBLISH.cmd failed with exit code $LASTEXITCODE." }
