param([string]$BaseUrl="http://127.0.0.1")
$ErrorActionPreference="Stop"
$paths=@(
  "/api/admin/overview-v2",
  "/api/admin/sources/summary",
  "/api/admin/dvr-storage/capabilities",
  "/api/admin/users-devices/capabilities",
  "/api/admin/diagnostics/capabilities",
  "/api/admin/recovery/capabilities",
  "/api/admin/production-readiness"
)
$failed=0
foreach($p in $paths){
  try{
    $r=Invoke-WebRequest -UseBasicParsing -Uri ($BaseUrl+$p) -TimeoutSec 15
    if($r.StatusCode -ge 200 -and $r.StatusCode -lt 400){Write-Host "PASS $p" -ForegroundColor Green}
    else{$failed++;Write-Host "FAIL $p HTTP $($r.StatusCode)" -ForegroundColor Red}
  }catch{$failed++;Write-Host "FAIL $p $($_.Exception.Message)" -ForegroundColor Red}
}
if($failed){throw "$failed Admin smoke test(s) failed."}
Write-Host "Admin production smoke test passed." -ForegroundColor Green
