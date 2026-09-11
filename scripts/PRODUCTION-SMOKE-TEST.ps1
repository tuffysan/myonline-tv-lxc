param([string]$BaseUrl="http://127.0.0.1")
$ErrorActionPreference="Stop"
$tests=@(
  @{Name="Root";Url="$BaseUrl/"},
  @{Name="Health";Url="$BaseUrl/api/appliance/health"},
  @{Name="Version";Url="$BaseUrl/api/appliance/version"}
)
$failed=0
foreach($t in $tests){
  try{
    $r=Invoke-WebRequest -UseBasicParsing -Uri $t.Url -TimeoutSec 15
    if($r.StatusCode -ge 200 -and $r.StatusCode -lt 400){Write-Host "PASS $($t.Name)" -ForegroundColor Green}
    else{$failed++;Write-Host "FAIL $($t.Name): HTTP $($r.StatusCode)" -ForegroundColor Red}
  }catch{$failed++;Write-Host "FAIL $($t.Name): $($_.Exception.Message)" -ForegroundColor Red}
}
if($failed){throw "$failed production smoke test(s) failed."}
Write-Host "Production smoke test passed." -ForegroundColor Green
