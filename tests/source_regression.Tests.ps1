$ErrorActionPreference='Stop'
function Need([bool]$ok,[string]$name){ if(-not $ok){ throw "FAIL: $name" }; Write-Host "PASS: $name" }
$program=Get-Content app/Program.cs -Raw
$app=Get-Content app/wwwroot/app.js -Raw
$mobile=Get-Content app/wwwroot/mobile.js -Raw
$cw=Get-Content app/wwwroot/continue-watching.js -Raw
$release=Get-Content RELEASE.ps1 -Raw
foreach($x in @('/api/downloads/summary','/api/downloads/history','downloadCancellations','downloads-state.json','SemaphoreSlim(2, 2)','Status = "Interrupted"')){ Need ($program.Contains($x)) "Downloads 2.0: $x" }
foreach($x in @('DOWNLOADS 2.0','downloadSeriesBatch','Clear failed/cancelled history','setTimeout')){ Need ($app.Contains($x)) "Downloads UI: $x" }
Need ($app.Contains('async function resumeContinueItem(item)')) 'Continue resolver'
Need ($app.Contains('/api/vod/${currentProvider}/${encodeURIComponent(movieId)}/token')) 'Continue movie playback token'
Need ($app.Contains('/api/series/${currentProvider}/episode/${encodeURIComponent(episodeId)}/token')) 'Continue episode playback token'
Need ($app.Contains('function ensureMediaPlayerHost()') -and $app.Contains("wrap.id='mediaPlayer'")) 'Guaranteed media player host'
Need ($mobile.Contains('await playServerMedia(t.playToken')) 'Favourite reaches player'
Need ($cw.Contains("['Continue',")) 'Continue action'
Need ($cw.Contains('Start from beginning') -and $cw.Contains('positionSeconds:0')) 'Restart action'
Need ($cw.Contains('Mark as watched') -and $cw.Contains('markContinueWatchingWatched')) 'Mark watched action'
Need ($cw.Contains('Remove from Continue Watching')) 'Remove action'
Need ($mobile.Contains('collectionSearch') -and $mobile.Contains('Search Continue Watching')) 'Continue Watching search'
Need ($app.Contains('<option value=adult>Adult (18+)</option>')) 'Adult filter'
Need ($app.Contains('personalSetAdultGroups(true)') -and $app.Contains('personalSetAdultGroups(false)')) 'Adult enable/disable controls'
Need ($program.Contains('/api/providers/{providerId}/adult-groups')) 'Adult backend endpoint'
Need ($program.Contains('EnumerateArray().Take(100000)') -and $program.Contains('ParseM3u(text).Take(100000)')) '100k IPTV ceilings'
Write-Host 'PASS: PowerShell source regression fallback.'
