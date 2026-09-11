$ErrorActionPreference="Stop"
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
if(-not (Get-Command java -ErrorAction SilentlyContinue)){throw "Java/JDK not found"}
Write-Host "MyOnline TV Android TV v6.2.0 preflight" -ForegroundColor Cyan
if(Test-Path (Join-Path $root "gradlew.bat")){
  & (Join-Path $root "gradlew.bat") :app:assembleDebug
  if($LASTEXITCODE){throw "Android build failed"}
} else {
  Write-Host "Gradle wrapper is not bundled. Open clients/android-tv in Android Studio, sync, then build app." -ForegroundColor Yellow
}
