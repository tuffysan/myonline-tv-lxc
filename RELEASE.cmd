@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  MyOnline TV - One-click verified release
 echo ============================================================
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0RELEASE.ps1" -RepoPath "%CD%"
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo ============================================================
  echo  RELEASE FAILED. Exit code: %RC%
  echo ============================================================
  exit /b %RC%
)

echo.
echo ============================================================
echo  RELEASE COMPLETED SUCCESSFULLY
 echo ============================================================
exit /b 0
