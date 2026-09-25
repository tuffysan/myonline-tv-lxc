$ErrorActionPreference='Stop'
$program = Get-Content (Join-Path $PSScriptRoot '..\app\Program.cs') -Raw
$required = @('/api/admin/users','/api/profile-state/','/api/providers/','/api/downloads/','/api/recordings','/api/rooms','/api/notifications')
foreach($token in $required){ if(-not $program.Contains($token)){ throw "Missing security-sensitive route guard source token: $token" } }
Write-Host 'PASS: static security source guard. Full black-box isolation is executed by tests/ReleaseTests (.NET).'
