@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  MyOnline TV - Build, authenticate and publish
echo ============================================================
echo.

powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "%~dp0PUBLISH.ps1" -RepoPath "%CD%"
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo ============================================================
  echo  Publish failed. Exit code: %RC%
  echo ============================================================
  exit /b %RC%
)

echo.
echo Publish completed successfully.
exit /b 0
