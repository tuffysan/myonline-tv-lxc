@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  MyOnline TV - GitHub Auth Repair + Push
echo ============================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Git is not installed or not in PATH.
  exit /b 1
)

where gh >nul 2>&1
if errorlevel 1 (
  echo [1/6] GitHub CLI missing. Installing with winget...
  where winget >nul 2>&1
  if errorlevel 1 (
    echo ERROR: gh and winget are both unavailable.
    exit /b 1
  )
  winget install --id GitHub.cli --exact --source winget --accept-package-agreements --accept-source-agreements
  if errorlevel 1 exit /b 1
  set "PATH=%ProgramFiles%\GitHub CLI;%PATH%"
) else (
  echo [1/6] GitHub CLI found.
)

echo [2/6] Clearing stale GITHUB_TOKEN/GH_TOKEN for this process...
set "GITHUB_TOKEN="
set "GH_TOKEN="

echo [3/6] Removing stale user-level token variables...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Environment]::SetEnvironmentVariable('GITHUB_TOKEN',$null,'User'); [Environment]::SetEnvironmentVariable('GH_TOKEN',$null,'User')" >nul 2>&1

echo [4/6] Checking GitHub login...
gh auth status --hostname github.com >nul 2>&1
if errorlevel 1 (
  echo.
  echo A GitHub browser login will open. Complete it once.
  echo.
  gh auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 (
    echo ERROR: GitHub login failed.
    exit /b 1
  )
)

echo [5/6] Configuring Git credentials and testing origin...
gh auth setup-git --hostname github.com
if errorlevel 1 (
  echo ERROR: gh auth setup-git failed.
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo ERROR: Run this CMD from the repository root.
  exit /b 1
)

git ls-remote origin HEAD >nul 2>&1
if errorlevel 1 (
  echo ERROR: GitHub authentication still failed for origin.
  echo.
  gh auth status --hostname github.com
  exit /b 1
)

echo [6/6] Pushing main...
git push origin main
if errorlevel 1 (
  echo ERROR: Authentication succeeded, but git push failed.
  exit /b 1
)

echo.
echo ============================================================
echo  SUCCESS - GitHub authentication works and main is pushed.
echo ============================================================
echo.
echo Now run:
echo   PUBLISH.cmd
echo.
exit /b 0
