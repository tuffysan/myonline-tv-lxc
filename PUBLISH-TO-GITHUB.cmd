@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0PUBLISH-TO-GITHUB.ps1"
set "RC=%ERRORLEVEL%"
echo.
if not "%RC%"=="0" (
  echo Publiceringen misslyckades. Felkod: %RC%
  exit /b %RC%
)
echo Publiceringen ar klar.
endlocal
