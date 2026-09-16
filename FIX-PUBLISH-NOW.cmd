@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo  MyOnline TV - Repair and Publish v35.0.3
echo ============================================================
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0FIX-PUBLISH-NOW.ps1"
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo Repair/publish failed. Exit code: %RC%
  exit /b %RC%
)
echo.
echo Repair/publish completed.
exit /b 0
