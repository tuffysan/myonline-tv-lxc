@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLISH.ps1" -RepoPath "%CD%"
if errorlevel 1 (
  echo.
  echo Publish failed.
  exit /b 1
)
echo.
echo Publish completed successfully.
