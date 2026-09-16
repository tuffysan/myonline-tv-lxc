@echo off
setlocal
cd /d "%~dp0"

echo MyOnline TV - repair GitHub authentication and publish
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-GITHUB-AUTH-AND-PUBLISH.ps1" -RepoPath "%CD%"
if errorlevel 1 (
  echo.
  echo Authentication/publish failed.
  exit /b 1
)

echo.
echo Authentication and publish completed successfully.
exit /b 0
