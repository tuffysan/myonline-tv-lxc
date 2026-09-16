@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  MyOnline TV - GitHub Auth Repair v2
echo ============================================================
echo.

where git >nul 2>&1 || (
  echo ERROR: Git is not installed or not in PATH.
  exit /b 1
)

where gh >nul 2>&1 || (
  echo ERROR: GitHub CLI ^(gh^) is not installed or not in PATH.
  exit /b 1
)

echo [1/5] Ignoring stale GitHub token variables...
set "GITHUB_TOKEN="
set "GH_TOKEN="

echo [2/5] Checking stored GitHub CLI login...
gh auth status --hostname github.com >nul 2>&1
if errorlevel 1 (
  echo.
  echo GitHub login is required.
  echo Your browser should open. Complete the GitHub authorization.
  echo.
  gh auth login --hostname github.com --git-protocol https --web
  if errorlevel 1 (
    echo.
    echo ERROR: GitHub login failed.
    exit /b 1
  )
)

echo [3/5] Configuring Git to use GitHub CLI...
gh auth setup-git --hostname github.com
if errorlevel 1 (
  echo ERROR: Could not configure Git authentication.
  exit /b 1
)

echo [4/5] Testing GitHub access...
git ls-remote origin HEAD >nul 2>&1
if errorlevel 1 (
  echo ERROR: Authentication test against origin failed.
  echo.
  gh auth status --hostname github.com
  exit /b 1
)

echo [5/5] Pushing main...
git push origin main
if errorlevel 1 (
  echo ERROR: Authentication works, but git push origin main failed.
  exit /b 1
)

echo.
echo ============================================================
echo  SUCCESS
echo  GitHub authentication works and main has been pushed.
echo ============================================================
echo.
exit /b 0
