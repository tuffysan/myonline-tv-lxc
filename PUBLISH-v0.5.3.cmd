@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLISH-v0.5.3.ps1" -RepoPath "%CD%"
if errorlevel 1 (
  echo.
  echo Publish failed.
  exit /b 1
)
echo.
echo Publish script completed.
