using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

static class T {
    public static void Assert(bool ok, string message) { if (!ok) throw new Exception("FAIL: " + message); }
    public static void Pass(string message) => Console.WriteLine("PASS: " + message);
}


internal static class Program
{
    public static async Task<int> Main()
    {
        var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));
        var appJs = File.ReadAllText(Path.Combine(root,"app/wwwroot/app.js"));
        var stylesCss = File.ReadAllText(Path.Combine(root,"app/wwwroot/styles.css"));
        var mobileJs = File.ReadAllText(Path.Combine(root,"app/wwwroot/mobile.js"));
        var cwJs = File.ReadAllText(Path.Combine(root,"app/wwwroot/continue-watching.js"));
        var programCs = File.ReadAllText(Path.Combine(root,"app/Program.cs"));
        var updateLocalSh = File.ReadAllText(Path.Combine(root,"scripts/update-local.sh"));
        var versionGuardPs1 = File.ReadAllText(Path.Combine(root,"scripts/Release-VersionGuard.ps1"));

        static void Has(string text,string token,string name){T.Assert(text.Contains(token,StringComparison.Ordinal),name);T.Pass(name);}

        // v41.0.12 Player Layout Consolidation. Only canonical source variables are used in this test file.
        foreach(var x in new[]{"v41.0.12 — Player Layout Consolidation","width:min(calc(100% - 24px),960px)!important","max-width:960px!important","max-height:min(62vh,540px)!important","aspect-ratio:16 / 9!important","object-position:center center!important"}) Has(stylesCss,x,"v41.0.12 player layout: "+x);
        T.Assert(stylesCss.LastIndexOf("v41.0.12 — Player Layout Consolidation",StringComparison.Ordinal) > stylesCss.LastIndexOf("v41.0.8 — VOD Player Layout Root Fix",StringComparison.Ordinal),"v41.0.12 authoritative layout is final policy");T.Pass("v41.0.12 authoritative layout is final policy");
        T.Assert(stylesCss.Contains(".unifiedVideoPlayer:fullscreen") && stylesCss.Contains("width:100vw!important") && stylesCss.Contains("max-width:none!important"),"v41.0.12 fullscreen remains unrestricted");T.Pass("v41.0.12 fullscreen remains unrestricted");

        // v41.0.1 Playback & UX Quality Release — integrated quality gate.
        Has(appJs,"PLAYBACK_UX_QUALITY_VERSION='41.0.1'","v41 quality release marker");
        foreach(var x in new[]{"PLAYBACK_RELIABILITY_VERSION=","INSTANT_SEEK_VERSION=","ADAPTIVE_BUFFER_VERSION=","PLAYER_EXPERIENCE_VERSION=","MOVIES_SERIES_UX_VERSION=","LIVE_TV_RELIABILITY_VERSION="}) Has(appJs,x,"v41 integrated playback stack: "+x);
        T.Assert(appJs.Contains("installPlaybackReliability(video") && appJs.Contains("installAdaptiveVodBuffer(video,hls)"),"v41 VOD reliability and adaptive buffering are both installed"); T.Pass("v41 VOD reliability and adaptive buffering are both installed");
        T.Assert(appJs.Contains("requestInstantSeek") && !appJs.Contains("seekBar.disabled=true"),"v41 seek remains interactive and cancellable"); T.Pass("v41 seek remains interactive and cancellable");
        T.Assert(stylesCss.Contains("v41.0.12 — Player Layout Consolidation") && stylesCss.Contains("width:min(calc(100% - 24px),960px)!important") && stylesCss.Contains("max-width:960px!important"),"v41 authoritative contained player layout protected"); T.Pass("v41 authoritative contained player layout protected");
        T.Assert(appJs.Contains("NEXT_EPISODE_COUNTDOWN_SECONDS=10") && appJs.Contains("installResumeStartOverChoice"),"v41 Movies & Series continuity protected"); T.Pass("v41 Movies & Series continuity protected");
        T.Assert(appJs.Contains("installLiveReliability") && appJs.Contains("++livePlaybackGeneration;stopLiveReliability()"),"v41 Live TV recovery and stale-channel guard protected"); T.Pass("v41 Live TV recovery and stale-channel guard protected");
        T.Assert(programCs.Contains("\"-hls_list_size\", \"0\"") && programCs.Contains("\"-hls_playlist_type\", \"event\"") && programCs.Contains("independent_segments+temp_file") && programCs.Contains("\"-hls_list_size\", \"6\"") && programCs.Contains("delete_segments+append_list+omit_endlist+independent_segments+temp_file"),"v41 server HLS reliability policy protected"); T.Pass("v41 server HLS reliability policy protected");

        // Downloads 2.0 source-regression checks
        foreach(var x in new[]{"/api/downloads/summary","/api/downloads/history","downloadCancellations","downloads-state.json","SemaphoreSlim(2, 2)","Status = \"Interrupted\""}) Has(programCs,x,"Downloads 2.0: "+x);
        foreach(var x in new[]{"DOWNLOADS 2.0","downloadSeriesBatch","Clear failed/cancelled history","setTimeout"}) Has(appJs,x,"Downloads UI: "+x);

        // Playback-surface source-regression checks
        Has(appJs,"async function resumeContinueItem(item)","continue resolver exists");
        Has(appJs,"/api/vod/${currentProvider}/${encodeURIComponent(movieId)}/token","continue IPTV movie token");
        Has(appJs,"/api/series/${currentProvider}/episode/${encodeURIComponent(episodeId)}/token","continue IPTV episode token");
        Has(appJs,"compatibility resolver","continue legacy resolver");
        T.Assert(appJs.Contains("function ensureMediaPlayerHost()") && appJs.Contains("wrap.id='mediaPlayer'") && appJs.Contains("const wrap=ensureMediaPlayerHost();"),"player host is guaranteed"); T.Pass("player host is guaranteed");
        T.Assert(appJs.Split("const wrap=ensureMediaPlayerHost();").Length-1 >= 2,"direct/server playback use guaranteed host");T.Pass("direct/server playback use guaranteed host");
        Has(mobileJs,"const t=await api(`/api/vod/${currentProvider}/${encodeURIComponent(item.id)}/token`","favourite movie starts directly");
        Has(mobileJs,"await playServerMedia(t.playToken","favourite movie reaches player");
        Has(appJs,"tvHome361Poster(x,'favourite')","TV favourites route correctly");
        Has(appJs,"desktop362MediaCard(x,'favourite')","desktop favourites route correctly");
        Has(appJs,"kind==='favourite'?`openHomeFavourite","favourite action resolver");

        // Adult/IPTV source-regression checks
        Has(appJs,"<option value=adult>Adult (18+)</option>","Edit IPTV Adult filter");
        Has(appJs,"personalSetAdultGroups(true)","Enable Adult control");
        Has(appJs,"personalSetAdultGroups(false)","Disable Adult control");
        T.Assert(appJs.Contains("Adult channels") && appJs.Contains("Adult (18+) groups"),"Adult diagnostics counts");T.Pass("Adult diagnostics counts");
        Has(appJs,"refreshPersonalLiveDiagnostics()","Reload Live TV");
        Has(programCs,"/api/providers/{providerId}/adult-groups","Adult backend endpoint");
        Has(programCs,"EnumerateArray().Take(100000)","Xtream ceiling 100k");
        Has(programCs,"ParseM3u(text).Take(100000)","M3U ceiling 100k");

        // Continue Watching 2.0 source-regression checks
        Has(cwJs,"['Continue',","continue action");
        T.Assert(cwJs.Contains("Start from beginning") && cwJs.Contains("positionSeconds:0"),"restart action");T.Pass("restart action");
        T.Assert(cwJs.Contains("Mark as watched") && cwJs.Contains("markContinueWatchingWatched"),"mark watched action");T.Pass("mark watched action");
        Has(cwJs,"Remove from Continue Watching","remove action");
        T.Assert(mobileJs.Contains("collectionSearch") && mobileJs.Contains("Search Continue Watching"),"collection search");T.Pass("collection search");
        T.Assert(mobileJs.Contains("collectionProgressText") && mobileJs.Contains("% watched"),"collection progress");T.Pass("collection progress");
        Has(mobileJs,"openContinueActions(item.id,actions)","collection actions");

        // v40.4.0 VOD Seek & A/V Sync Engine.
        foreach(var x in new[]{"VOD_SEEK_ENGINE_VERSION=","mediaSeekBar","startAtSeconds=0","startSeconds","timelineOffset","savePlaybackPosition?.(true)"}) Has(appJs,x,"VOD Seek Engine: "+x);
        foreach(var x in new[]{"double? startSeconds","seekStartSeconds","-force_key_frames","aresample=async=1:first_pts=0","+genpts"}) Has(programCs,x,"VOD Seek server: "+x);
        Has(stylesCss,".mediaSeekBar","VOD Seek CSS");

        // Current VOD buffer/recovery invariants. Do not pin this gate to historical comment text.
        // These checks intentionally validate the active v41 behavior instead of v41.0.4 implementation wording.
        foreach(var x in new[]{"video.dataset.bufferAheadSeconds","const arm=(allowPaused=false)","video.addEventListener('waiting',()=>arm(true))","video.addEventListener('stalled',()=>arm(true))","video.dataset.userPaused==='1'","getHls?.()?.startLoad(-1)"}) Has(appJs,x,"current VOD buffer/recovery invariant: "+x);
        T.Assert(appJs.Contains("video.addEventListener('pause',()=>") && appJs.Contains("video.dataset.userPaused!=='1'&&!video.ended"),"current VOD recovery distinguishes browser underrun pause from intentional user pause"); T.Pass("current VOD recovery distinguishes browser underrun pause from intentional user pause");
        T.Assert(!appJs.Contains("status.textContent=ahead<3?'Buffering · replenishing…':'Playing · building buffer…'"),"current buffer telemetry does not fake playback state"); T.Pass("current buffer telemetry does not fake playback state");

        // v41.1.0 Playback Core supersedes the historical v40.6.1 Smart VOD buffer ceiling.
        // Keep the useful buffer/status invariants, but validate the active 60s/120s policy instead of the obsolete 240s ceiling.
        foreach(var x in new[]{"SMART_VOD_BUFFER_VERSION=","VOD_STARTUP_SEGMENTS=2","VOD_SEEK_SEGMENTS=1","VOD_BUFFER_FLOOR_SECONDS=15","VOD_BUFFER_TARGET_SECONDS=60","vodStatusUrl","bufferedAheadSeconds","installVodBufferMonitor","startFragPrefetch:true"}) Has(appJs,x,"Smart VOD compatibility: "+x);
        T.Assert(appJs.Contains("backBufferLength:60,maxBufferLength:60,maxMaxBufferLength:120"),"Playback Core owns the active VOD buffer ceiling"); T.Pass("Playback Core owns the active VOD buffer ceiling");
        T.Assert(!appJs.Contains("maxMaxBufferLength:240"),"obsolete 240 second VOD buffer ceiling is removed"); T.Pass("obsolete 240 second VOD buffer ceiling is removed");
        foreach(var x in new[]{"int? minSegments","requiredSegments","bufferedSegments = segmentCount","bufferedSeconds = segmentCount * session.SegmentDurationSeconds","-hls_time", "seekStartSeconds > 0 ? \"1\" : \"2\""}) Has(programCs,x,"Smart VOD server compatibility: "+x);


        // v41.0.13 VOD streaming pipeline: growing HLS manifests must never be cached.
        foreach(var x in new[]{"VOD_STREAMING_PIPELINE_VERSION='41.0.13'","VOD_STARTUP_SEGMENTS=2","VOD_SEEK_SEGMENTS=1","maxBufferLength:60","fragLoadingTimeOut:20000"}) Has(appJs,x,"v41.0.13 VOD pipeline: "+x);
        foreach(var x in new[]{"no-store, no-cache, must-revalidate, max-age=0","Pragma = \"no-cache\"","processRunning = !session.Process.HasExited","newestSegmentAgeMs"}) Has(programCs,x,"v41.0.13 HLS delivery: "+x);


        // v41.1.0 Playback Core — Direct Play first, codec-aware fallback, atomic EVENT HLS.
        foreach(var x in new[]{"PLAYBACK_CORE_VERSION='41.1.1'","tryDirectVodPlayback(token,name,mediaId,poster,initialResume)","Direct VOD fallback to compatibility HLS","backBufferLength:60,maxBufferLength:60,maxMaxBufferLength:120"}) Has(appJs,x,"v41.1 playback core: "+x);
        foreach(var x in new[]{"playback-core-41.1","ProbeMediaProfile","hls-transcode","-reconnect_streamed","-hls_playlist_type", "independent_segments+temp_file"}) Has(programCs,x,"v41.1 server playback core: "+x);


        // v41.1.1 Playback Startup Fix — Live and VOD have independent startup profiles.
        foreach(var x in new[]{"PLAYBACK_STARTUP_FIX_VERSION='41.1.1'","LIVE_STARTUP_SEGMENTS=1","VOD_STARTUP_SEGMENTS=2","liveSyncDurationCount:1","maxBufferLength:8","setTimeout(()=>{if(video.readyState>=3&&!video.paused)commit();else bad()},5000)"}) Has(appJs,x,"v41.1.1 startup: "+x);
        foreach(var x in new[]{"-preset", "\"ultrafast\"", "-analyzeduration", "\"1000000\"", "-probesize", "\"1000000\"", "-hls_time", "\"1\""}) Has(programCs,x,"v41.1.1 server startup: "+x);
        T.Assert(!appJs.Contains(")),VOD_STARTUP_SEGMENTS));\n      if(state.status==='ready')break;\n      if(state.status==='failed')throw new Error(state.error||'FFmpeg could not prepare this channel.')"),"Live TV does not use the VOD startup threshold"); T.Pass("Live TV does not use the VOD startup threshold");

        // v41.2.1 Subtitle Selection — embedded text subtitle streams are discoverable and selectable as WebVTT.
        foreach(var x in new[]{"SUBTITLE_SELECTION_VERSION='41.2.4'","installSubtitleSelector(video,token)","mediaSubtitles","el.track.mode='showing'","/api/media/subtitles/"}) Has(appJs + programCs,x,"v41.2.1 subtitles: "+x);
        foreach(var x in new[]{"codec is not (\"subrip\" or \"srt\" or \"ass\"","\"-f\",\"webvtt\"","text/vtt; charset=utf-8"}) Has(programCs,x,"v41.2.1 subtitle server: "+x);
        foreach(var x in new[]{"SUBTITLE_SYNC_PRESENTATION_VERSION='41.2.4'","cue.line=76","cue.position=50","cue.align='center'"}) Has(appJs,x,"v41.2.3 subtitle presentation: "+x);
        foreach(var x in new[]{"\"-fflags\"","\"+genpts\"","\"-fix_sub_duration\"","\"-vn\"","\"-an\""}) Has(programCs,x,"v41.2.4 subtitle timeline: "+x);
        if(programCs.Contains("\"-copyts\"") || programCs.Contains("\"-start_at_zero\"")) throw new Exception("v41.2.4 subtitles must not rewrite the media timeline with copyts/start_at_zero");

        // v41.2.5 Audio Language Selection — multiple embedded audio tracks are discoverable and selectable.
        foreach(var x in new[]{"AUDIO_TRACK_SELECTION_VERSION='41.2.5'","mediaAudioTracks","installAudioTrackSelector","/api/media/audio-tracks/","audioStreamIndex"}) Has(appJs + programCs,x,"v41.2.5 audio tracks: "+x);
        foreach(var x in new[]{"stream=index,codec_type,codec_name,channels:stream_tags=language,title:stream_disposition=default","codec_type\", out var ct","audioStreamIndex is int selectedAudio ? $\"0:{selectedAudio}?\" : \"0:a:0?\""}) Has(programCs,x,"v41.2.5 audio server: "+x);

        // v41.2.0 Native Seek & Smart Playback Pipeline — Direct Play must seek on the same resource via browser Range/206.
        foreach(var x in new[]{"NATIVE_SMART_SEEK_VERSION='41.2.0'","installNativeVodSeek(video)","video.fastSeek","video._myOnlineTvSeekAbsolute=commit","Playing · native seek","durationSeconds = probe?.DurationSeconds","range = true"}) Has(appJs + programCs,x,"v41.2.0 native seek: "+x);
        Has(programCs,"enableRangeProcessing: true","v41.2.0 Range/206 server path");

        // v41.1.2 Instant VOD Seek — one-segment seek startup and bounded UI state.
        foreach(var x in new[]{"INSTANT_VOD_SEEK_VERSION='41.1.2'","VOD_SEEK_SEGMENTS=1","SEEK_READY_TIMEOUT_MS=7000","hls.startLoad(0)","video.addEventListener('playing',finishSeekUi,{once:true})","st.textContent==='Seeking…'"}) Has(appJs,x,"v41.1.2 instant seek: "+x);
        foreach(var x in new[]{"seekStartSeconds > 0 ? \"1\" : \"2\"","seekStartSeconds > 0 ? \"expr:gte(t,n_forced*1)\" : \"expr:gte(t,n_forced*2)\"","SegmentDurationSeconds","segmentCount * session.SegmentDurationSeconds"}) Has(programCs,x,"v41.1.2 seek server: "+x);

        // v41.0.12 CURRENT PLAYBACK CONTRACT.
        // Historical playback implementation strings from v40.x/v41.0.x must not gate current releases.
        // Validate only active behavior/invariants that the current player depends on.
        foreach(var x in new[]{
            "PLAYBACK_STABILIZATION_VERSION='41.0.11'",
            "PLAYBACK_RELIABILITY_VERSION=",
            "INSTANT_SEEK_VERSION=",
            "ADAPTIVE_BUFFER_VERSION=",
            "PLAYER_EXPERIENCE_VERSION=",
            "MOVIES_SERIES_UX_VERSION=",
            "LIVE_TV_RELIABILITY_VERSION=",
            "installPlaybackReliability(video",
            "installAdaptiveVodBuffer(video,hls)",
            "requestInstantSeek",
            "video.dataset.bufferAheadSeconds",
            "video.addEventListener('waiting',()=>arm(true))",
            "video.addEventListener('stalled',()=>arm(true))",
            "video.dataset.userPaused==='1'",
            "getHls?.()?.startLoad(-1)",
            "VOD_RECOVERY_BUFFER_SECONDS=3",
            "VOD_STALL_CONFIRM_MS=1800",
            "VOD_RECOVERY_COOLDOWN_MS=2500",
            "resumeWhenReady"
        }) Has(appJs,x,"current v41 playback contract: "+x);
        T.Assert(!appJs.Contains("seekBar.disabled=true"),"current v41 seek remains interactive"); T.Pass("current v41 seek remains interactive");
        T.Assert(appJs.Contains("video.addEventListener('pause',()=>") && appJs.Contains("video.dataset.userPaused!=='1'&&!video.ended"),"current v41 recovery separates intentional pause from underrun"); T.Pass("current v41 recovery separates intentional pause from underrun");
        T.Assert(appJs.Contains("installLiveReliability") && appJs.Contains("++livePlaybackGeneration;stopLiveReliability()"),"current v41 Live TV recovery contract"); T.Pass("current v41 Live TV recovery contract");
        T.Assert(appJs.Contains("NEXT_EPISODE_COUNTDOWN_SECONDS=10") && appJs.Contains("installResumeStartOverChoice"),"current v41 Movies & Series continuity contract"); T.Pass("current v41 Movies & Series continuity contract");
        T.Assert(stylesCss.Contains("v41.0.12 — Player Layout Consolidation") && stylesCss.Contains("max-width:960px!important") && stylesCss.Contains("object-fit:contain!important"),"current v41 player geometry contract"); T.Pass("current v41 player geometry contract");
        T.Assert(programCs.Contains("\"-hls_list_size\", \"0\"") && programCs.Contains("\"-hls_playlist_type\", \"event\"") && programCs.Contains("\"-hls_list_size\", \"6\"") && programCs.Contains("independent_segments+temp_file"),"current v41 server HLS contract"); T.Pass("current v41 server HLS contract");

        // v40.1.0 Home Experience 3.0.
        foreach(var x in new[]{"HOME_EXPERIENCE_3_VERSION='40.2.0'","renderHomeExperience3","homeExperience3Hero","homeExperience3Rail","homeExperience3Card","homeExperience3Capabilities"}) Has(appJs,x,"Home Experience 3.0: "+x);
        foreach(var x in new[]{"Continue Watching","Live Now","Favorites","Recently Added","Movies","Series","Downloads"}) Has(appJs,x,"Home Experience 3.0 surface: "+x);
        T.Assert(appJs.Contains("resumeContinueItem("),"Home 3 Continue Watching uses shared playback");T.Pass("Home 3 Continue Watching uses shared playback");
        T.Assert(appJs.Contains("openHomeFavourite("),"Home 3 Favorites use existing routing");T.Pass("Home 3 Favorites use existing routing");
        foreach(var x in new[]{".homeExperience3",".hx3Hero",".hx3Quick",".hx3Rail",".hx3Card",".mtv-device-tv.homeExperience3"}) Has(stylesCss,x,"Home Experience 3.0 CSS: "+x);
        T.Assert(updateLocalSh.Contains("RUNTIME_VERSION"),"Updater validates runtime target version");T.Pass("Updater validates runtime target version");
        // v40.0.0 MyOnlineTV Experience 2.0 — additive to every previous release gate.
        foreach(var x in new[]{"MyOnlineTV Experience 2.0","MYONLINETV_EXPERIENCE_2_VERSION='40.1.0'","experience40Surface","experience40Home","experience40Library","experience40PlayerChrome","experience40ProfileShell","experience40RoutePlayback","experience40Capabilities"})
            Has(appJs,x,"MyOnlineTV Experience 2.0: "+x);
        T.Assert(appJs.Contains("devices:['mobile','tablet','desktop','tv']"),"v40 supports all target device classes");T.Pass("v40 supports all target device classes");
        T.Assert(appJs.Contains("source==='continue')return playbackFromContinue(item)"),"v40 Continue Watching uses shared playback");T.Pass("v40 Continue Watching uses shared playback");
        T.Assert(appJs.Contains("source==='favorite')return playbackFromFavourite(item)"),"v40 Favorites use shared playback");T.Pass("v40 Favorites use shared playback");
        T.Assert(appJs.Contains("if(kind==='download')return downloads21Play(item)"),"v40 Downloads use shared playback");T.Pass("v40 Downloads use shared playback");
        T.Assert(appJs.Contains("policy:profile3Policy(p)"),"v40 profile shell retains family policy");T.Pass("v40 profile shell retains family policy");
        T.Assert(appJs.Contains("legacyCompatible:true"),"v40 retains migration compatibility");T.Pass("v40 retains migration compatibility");
        foreach(var x in new[]{".mtv-player-chrome",".mtv-profile-shell",".mtv-device-tv.mtv-navigation"})
            Has(stylesCss,x,"v40 CSS: "+x);

        // v39.19.0 RC3 release-version regression coverage.
        Has(versionGuardPs1,"Sort-Object -Descending","VersionGuard resolves newest published tag");
        Has(versionGuardPs1,"Version upgrade accepted: $currentVersion -> $Candidate","VersionGuard logs current and candidate versions");
        var releaseVersionTests = File.ReadAllText(Path.Combine(root,"tests/release_version.Tests.ps1"));
        T.Assert(releaseVersionTests.Contains("Expect-Accept '39.19.0' @('v39.17.0'"),"PowerShell tests allow 39.17.0 to 39.19.0");T.Pass("PowerShell tests allow 39.17.0 to 39.19.0");
        T.Assert(releaseVersionTests.Contains("Expect-Reject '39.18.0' @('v39.19.0'"),"PowerShell tests block downgrade");T.Pass("PowerShell tests block downgrade");

        // v39.19.0 RC2 release-version policy: intermediate releases may be skipped.
        Has(versionGuardPs1,"$candidateVersion -le $currentVersion","VersionGuard blocks same/older versions");
        Has(versionGuardPs1,"must be newer than current release","VersionGuard monotonic version error");
        T.Assert(!versionGuardPs1.Contains("must be the next patch, next minor .0, or next major .0.0"),"VersionGuard does not require intermediate releases");T.Pass("VersionGuard does not require intermediate releases");

        // Experience Migration v39.19.0 — additive to all previous coverage.
        foreach(var x in new[]{"Experience Migration","EXPERIENCE_MIGRATION_VERSION='39.19.0'","experience19Tokens","experience19Device","experience19Class","experience19MediaCard","experience19Hero","experience19Rail","experience19Navigation","experience19Dialog","experience19Capabilities"})
            Has(appJs,x,"Experience Migration: "+x);
        foreach(var x in new[]{"--mtv-space-md","--mtv-radius-lg",".mtv-media-card",".mtv-rail",".mtv-hero",".mtv-navigation",".mtv-dialog","prefers-reduced-motion"})
            Has(stylesCss,x,"Experience Migration CSS: "+x);
        T.Assert(appJs.Contains("devices:['mobile','tablet','desktop','tv']"),"Experience system covers all target devices");T.Pass("Experience system covers all target devices");
        T.Assert(appJs.Contains("legacyCompatible:true"),"Experience migration remains legacy compatible");T.Pass("Experience migration remains legacy compatible");
        T.Assert(stylesCss.Contains(".mtv-media-card:focus-visible"),"Experience components include keyboard/TV focus state");T.Pass("Experience components include keyboard/TV focus state");
        T.Assert(stylesCss.Contains("@media (prefers-reduced-motion:reduce)"),"Experience system respects reduced motion");T.Pass("Experience system respects reduced motion");

        // Performance & Reliability v39.18.0 — additive to all previous coverage.
        foreach(var x in new[]{"Performance & Reliability","PERFORMANCE_RELIABILITY_VERSION='39.18.0'","perf18CacheSet","perf18CacheGet","perf18CacheClear","perf18Coalesce","perf18Cached","perf18Chunk","perf18Sample","perf18Diagnostics","perf18Health","perf18MemorySnapshot"})
            Has(appJs,x,"Performance & Reliability: "+x);
        T.Assert(appJs.Contains("while(perf18Cache.size>Math.max(10,Number(maxEntries)||250))"),"Performance cache is bounded");T.Pass("Performance cache is bounded");
        T.Assert(appJs.Contains("if(perf18Inflight.has(k)){perf18Metrics.coalesced++"),"Duplicate inflight requests are coalesced");T.Pass("Duplicate inflight requests are coalesced");
        T.Assert(appJs.Contains("if(perf18Metrics.samples.length>100)"),"Runtime samples are bounded");T.Pass("Runtime samples are bounded");
        T.Assert(appJs.Contains("fetcher('/api/health',{cache:'no-store'})"),"Health probe bypasses stale cache");T.Pass("Health probe bypasses stale cache");
        T.Assert(appJs.Contains("Math.max(25,Math.min(1000,Number(size)||250))"),"Large library chunk size is bounded");T.Pass("Large library chunk size is bounded");

        // Downloads 2.1 regression checks — additive to all previous coverage.
        foreach(var x in new[]{"Downloads 2.1","DOWNLOADS_21_VERSION='39.17.0'","downloads21Normalize","downloads21Queue","downloads21CanRetry","downloads21RetryDelay","downloads21Storage","downloads21OfflineLibrary","downloads21SeriesGroups","downloads21CleanupCandidates","downloads21ProfileFilter","downloads21Play"})
            Has(appJs,x,"Downloads 2.1: "+x);
        T.Assert(appJs.Contains("return d.status==='failed' && d.retries<"),"Downloads 2.1 bounded retry policy");T.Pass("Downloads 2.1 bounded retry policy");
        T.Assert(appJs.Contains("Math.min(30000,1000*Math.pow(2,n))"),"Downloads 2.1 retry backoff");T.Pass("Downloads 2.1 retry backoff");
        T.Assert(appJs.Contains("String(x?.profileId||'default')===pid"),"Downloads 2.1 profile isolation filter");T.Pass("Downloads 2.1 profile isolation filter");
        T.Assert(appJs.Contains("if(d.status!=='completed')throw new Error('Download is not available offline')"),"Downloads 2.1 offline playback guard");T.Pass("Downloads 2.1 offline playback guard");
        T.Assert(appJs.Contains("playbackEngine({kind:'download'"),"Downloads 2.1 uses Playback Engine 3.0");T.Pass("Downloads 2.1 uses Playback Engine 3.0");

        // Profiles & Family 3.0 regression checks — additive to all previous coverage.
        foreach(var x in new[]{"Profiles & Family 3.0","PROFILES_FAMILY_3_VERSION='39.16.0'","profile3Normalize","profile3ScopeKey","profile3Policy","profile3CanShow","profile3Filter","profile3LocalGet","profile3LocalSet","profile3ClearLocal","profile3MigrateDiscoveryHistory","profile3Areas"})
            Has(appJs,x,"Profiles & Family 3.0: "+x);
        T.Assert(appJs.Contains("allowAdult:!p.isKids && p.adultEnabled"),"Kids profiles cannot enable Adult content");T.Pass("Kids profiles cannot enable Adult content");
        T.Assert(appJs.Contains("if(adult && !policy.allowAdult)return false;"),"Adult content obeys profile policy");T.Pass("Adult content obeys profile policy");
        T.Assert(appJs.Contains("myonlinetv.profile.${String(profileId||'default')}."),"Profile-local state keys are profile scoped");T.Pass("Profile-local state keys are profile scoped");
        foreach(var area in new[]{"favorites","continue-watching","history","search-history","downloads","recent-channels"})
            Has(appJs,$"'{area}'","Profiles & Family area: "+area);

        // Search & Discovery 2.0 regression checks — additive to all previous coverage.
        foreach(var x in new[]{"Search & Discovery 2.0","SEARCH_DISCOVERY_2_VERSION='39.15.0'","discovery2Normalize","discovery2Index","discovery2Search","discovery2Sections","discovery2RecentStoreKey","discovery2RecentGet","discovery2RecentAdd","discovery2RecentClear","discovery2Suggestions","discovery2Play"})
            Has(appJs,x,"Search & Discovery 2.0: "+x);
        T.Assert(appJs.Contains("myonlinetv.discovery.recent.${String(profileId||'default')}"),"Search history is profile scoped");T.Pass("Search history is profile scoped");
        T.Assert(appJs.Contains("if(kind==='live') return playbackEngine"),"Search Live TV uses Playback Engine 3.0");T.Pass("Search Live TV uses Playback Engine 3.0");
        T.Assert(appJs.Contains("if(kind==='movie'||kind==='series'||kind==='episode')"),"Search VOD uses Playback Engine 3.0");T.Pass("Search VOD uses Playback Engine 3.0");
        T.Assert(appJs.Contains(".slice(0,Math.max(1,Number(limit)||100))"),"Search result limit guard");T.Pass("Search result limit guard");

        // Movies & Series 3.0 regression checks — additive to every previous release gate.
        foreach(var x in new[]{"Movies & Series 3.0","MOVIES_SERIES_3_VERSION='39.14.0'","vod3Progress","vod3EpisodeLabel","vod3GroupEpisodes","vod3PlaybackRequest","vod3Play","vod3Resume","vod3Restart","vod3DetailModel","vod3Search","vod3Sort","vod3NextEpisode"})
            Has(appJs,x,"Movies & Series 3.0: "+x);
        T.Assert(appJs.Contains("return playbackEngine(vod3PlaybackRequest(item,options));"),"Movies & Series 3.0 uses Playback Engine 3.0");T.Pass("Movies & Series 3.0 uses Playback Engine 3.0");
        T.Assert(appJs.Contains("restart?0:Math.max(0,Number(item?.positionSeconds)||0)"),"Movies & Series 3.0 resume/start-over contract");T.Pass("Movies & Series 3.0 resume/start-over contract");
        T.Assert(appJs.Contains("vod3GroupEpisodes(episodes).flatMap"),"Movies & Series 3.0 next episode navigation");T.Pass("Movies & Series 3.0 next episode navigation");

        // v39.13.1 updater backup hardening — additive regression coverage.
        Has(updateLocalSh,"--exclude='./live-hls'","Updater backup excludes transient live-hls");
        Has(updateLocalSh,"--exclude='./downloads'","Updater backup excludes downloads");
        Has(updateLocalSh,"--exclude='./backups'","Updater backup excludes backup directory");
        Has(updateLocalSh,"tail -n +4","Updater retains only three newest pre-update backups");
        Has(updateLocalSh,"name 'pre-update-*.tar.gz'","Updater cleanup targets only pre-update backups");
        T.Assert(updateLocalSh.IndexOf("tar --exclude='./backups'",StringComparison.Ordinal) < updateLocalSh.IndexOf("tail -n +4",StringComparison.Ordinal),"Backup retention cleanup must run after successful backup creation");T.Pass("Backup retention cleanup occurs after backup creation");

        // Playback Engine 3.0 regression checks — additive to all existing release coverage.
        foreach(var x in new[]{"Playback Engine 3.0","playbackFromContinue","playbackFromFavourite","playbackFromSearch","kind==='live'","kind==='download'","kind==='server-token'","recoverLivePlayback"})
            Has(appJs,x,"Playback Engine 3.0: "+x);
        T.Assert(appJs.Contains("if(!item?.__fromPlaybackEngine) return playbackFromContinue(item);"),"Playback Engine 3.0 Continue Watching routing");T.Pass("Playback Engine 3.0 Continue Watching routing");
        T.Assert(appJs.Contains("resumeSeconds:item?.positionSeconds||0"),"Playback Engine 3.0 resume contract");T.Pass("Playback Engine 3.0 resume contract");
        T.Assert(appJs.Contains("console.error('Playback Engine 3.0 failed'"),"Playback Engine 3.0 diagnostics");T.Pass("Playback Engine 3.0 diagnostics");

        // Live TV 2.0 regression checks — additive to all existing release coverage.
        foreach(var x in new[]{"Live TV 2.0","__favorites","__recent","__now","clearLiveRecents()","refreshLiveEpg()","openMiniGuide()","stepLiveChannel(-1)","stepLiveChannel(1)","liveProgramFor(c)","Record series"}) Has(appJs,x,"Live TV 2.0: "+x);
        T.Assert(appJs.Contains("LIVE_RECENTS_KEY+':'+privateScope()"),"Live TV 2.0 recent channels remain profile scoped");T.Pass("Live TV 2.0 recent channels remain profile scoped");
        T.Assert(appJs.Contains("if(g==='__favorites')") && appJs.Contains("fav.has(c.id)"),"Live TV 2.0 favourites filter");T.Pass("Live TV 2.0 favourites filter");

        // IPTV Manager 2.0 regression checks — keep all previous gates and add coverage for the new manager.
        foreach(var x in new[]{"IPTV MANAGER 2.0","Search groups…","Active only","Inactive only","Adult (18+)","Search channels…","Activate selected","Deactivate selected","Preview changes","Reload Live TV","Sync diagnostics","Smart Filters","iptvExportFilters()","iptvImportFilters()"}) Has(appJs,x,"IPTV Manager 2.0: "+x);
        foreach(var x in new[]{"/api/providers/{providerId}/refresh-live-preview","/api/providers/{providerId}/refresh-live","/api/providers/{providerId}/sync-diagnostics","/api/providers/{providerId}/refresh-settings","/api/library-management/{providerId}"}) Has(programCs,x,"IPTV Manager 2.0 API: "+x);
        T.Assert(appJs.Contains("Adult group(s) stay inactive") || appJs.Contains("Adult (18+) groups are protected"),"IPTV Manager 2.0 Adult bulk protection");T.Pass("IPTV Manager 2.0 Adult bulk protection");

        // v41.0.6 — Continue Watching UX regression guard.
        T.Assert(appJs.Contains("wrap.classList.add('dynamicMediaPlayer','mediaPlaybackSurface')") && appJs.Contains("main.insertBefore(wrap,content)"),"Continue Watching: player host is promoted to root playback surface");T.Pass("Continue Watching: player host is promoted to root playback surface");
        Has(appJs,"mediaResumeCard","Continue Watching: centered resume card markup");
        Has(appJs,"Continue watching</strong>","Continue Watching: explicit dialog heading");
        Has(stylesCss,".unifiedVideoPlayer .mediaResumeChoice{position:absolute;z-index:8;inset:0;display:grid;place-items:center","Continue Watching: overlay fills and centers in player stage");
        Has(stylesCss,".unifiedVideoPlayer .mediaResumeCard","Continue Watching: dedicated resume card styling");
        // v41.0.12: centering is owned by the authoritative root playback surface policy.
        // Do not require the retired #playerWrap.dynamicMediaPlayer selector; it caused historical CSS
        // implementations to become release blockers after the player layout was consolidated.
        T.Assert(stylesCss.Contains("main > .mediaPlaybackSurface > .unifiedVideoPlayer")
            && stylesCss.Contains("margin:0 auto!important")
            && stylesCss.Contains("max-width:960px!important"),
            "Continue Watching: current root playback surface centering contract");
        T.Pass("Continue Watching: current root playback surface centering contract");

        await ContinueApiBlackBox(root);
        await SecurityIsolationBlackBox(root);
        Console.WriteLine("All .NET release regression tests passed.");

        return 0;
    }

    static HttpClient Client(){ var h=new HttpClientHandler{CookieContainer=new CookieContainer(),AllowAutoRedirect=false}; return new HttpClient(h){Timeout=TimeSpan.FromSeconds(45)}; }
    static async Task<JsonElement> Call(HttpClient c,HttpMethod method,string route,object? body=null,string profile="default",HttpStatusCode expected=HttpStatusCode.OK){
        using var req=new HttpRequestMessage(method,"http://127.0.0.1:5080"+route); req.Headers.Add("X-MyOnline-Profile",profile);
        if(body!=null) req.Content=JsonContent.Create(body);
        using var res=await c.SendAsync(req); var raw=await res.Content.ReadAsByteArrayAsync();
        var responseText = Encoding.UTF8.GetString(raw);
        if (responseText.Length > 300) responseText = responseText[..300];
        T.Assert(res.StatusCode==expected,$"{method} {route}: {(int)res.StatusCode}, expected {(int)expected}: {responseText}");
        if(raw.Length==0)return default; return JsonDocument.Parse(raw).RootElement.Clone();
    }

    static async Task<HttpStatusCode> RawStatus(HttpClient c,HttpMethod method,string route,object? body=null,string profile="default"){
        using var req=new HttpRequestMessage(method,"http://127.0.0.1:5080"+route); req.Headers.Add("X-MyOnline-Profile",profile); if(body!=null) req.Content=JsonContent.Create(body); using var res=await c.SendAsync(req); return res.StatusCode;
    }
    static object Progress(string id)=>new{id,title="Räksmörgås",positionSeconds=90,durationSeconds=600};
    static Process StartApp(string root,string data){
        var dll=Path.Combine(root,"app/bin/Release/net10.0/MyOnlineTV.Web.dll");
        var psi=new ProcessStartInfo("dotnet",$"\"{dll}\""){WorkingDirectory=Path.Combine(root,"app"),UseShellExecute=false,RedirectStandardOutput=true,RedirectStandardError=true,CreateNoWindow=true}; psi.Environment["MYONLINE_DATA"]=data;
        var p=Process.Start(psi)!;
        for(int i=0;i<150;i++){ if(p.HasExited)break; try{ using var h=new HttpClient{Timeout=TimeSpan.FromMilliseconds(500)}; h.GetAsync("http://127.0.0.1:5080/api/auth/status").GetAwaiter().GetResult(); return p;}catch{Thread.Sleep(100);} }
        try{p.Kill(true);}catch{} throw new Exception("Test Kestrel failed to start on 127.0.0.1:5080");
    }
    static void Stop(Process? p){if(p==null)return;try{if(!p.HasExited){p.Kill(true);p.WaitForExit(10000);}}catch{}}
    static async Task<HttpClient> Login(string name,string password){var c=Client();await Call(c,HttpMethod.Post,"/api/auth/login",new{username=name,password});return c;}

    static async Task ContinueApiBlackBox(string root){
        var data=Path.Combine(Path.GetTempPath(),"myonline-continue-net-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(data);Process? p=null;
        try{
            var movie="iptv-movie:p:1";var episode="iptv-episode:p:2:mp4";
            File.WriteAllText(Path.Combine(data,"continue-watching.json"),JsonSerializer.Serialize(new[]{new{id=movie,title="Ångström episode/movie",url="",positionSeconds=75,durationSeconds=600,updated="2026-09-24T10:00:00Z"},new{id=episode,title="Ångström episode/movie",url="",positionSeconds=75,durationSeconds=600,updated="2026-09-24T10:00:00Z"}}));
            File.WriteAllBytes(Path.Combine(data,"untouched-media.mkv"),Encoding.UTF8.GetBytes("original media"));
            p=StartApp(root,data);var s=Client();var creds=new{username="continue-test",password="Test-password-4729!"};await Call(s,HttpMethod.Post,"/api/auth/setup",creds);
            T.Assert((await Call(s,HttpMethod.Get,"/api/continue")).GetArrayLength()==2,"continue seed count");
            await Call(s,HttpMethod.Put,"/api/profile-state/default/"+Uri.EscapeDataString(movie),new{title="Favourite movie",kind="movie",favourite=true,positionSeconds=75});
            var before=(await Call(s,HttpMethod.Get,"/api/profile-state/default")).GetRawText();
            await Call(s,HttpMethod.Delete,"/api/continue/"+Uri.EscapeDataString(movie),expected:HttpStatusCode.NoContent); await Call(s,HttpMethod.Delete,"/api/continue/"+Uri.EscapeDataString(movie),expected:HttpStatusCode.NoContent);
            var arr=await Call(s,HttpMethod.Get,"/api/continue");T.Assert(arr.GetArrayLength()==1 && arr[0].GetProperty("id").GetString()==episode,"movie removal/idempotency");
            var foreign=await RawStatus(s,HttpMethod.Get,"/api/continue",profile:"other-profile");T.Assert(foreign is HttpStatusCode.Forbidden or HttpStatusCode.NotFound,"foreign profile denied");
            await Call(s,HttpMethod.Post,"/api/auth/logout");s=await Login("continue-test","Test-password-4729!");T.Assert((await Call(s,HttpMethod.Get,"/api/continue")).GetArrayLength()==1,"logout/login persistence");
            Stop(p);p=StartApp(root,data);s=await Login("continue-test","Test-password-4729!");T.Assert((await Call(s,HttpMethod.Get,"/api/continue")).GetArrayLength()==1,"restart persistence");
            await Call(s,HttpMethod.Delete,"/api/continue/"+Uri.EscapeDataString(episode),expected:HttpStatusCode.NoContent);T.Assert((await Call(s,HttpMethod.Get,"/api/continue")).GetArrayLength()==0,"episode removal");
            await Call(s,HttpMethod.Post,"/api/continue",new{id=movie,title="Ångström episode/movie",url="",positionSeconds=75,durationSeconds=600,updated="2026-09-24T10:00:00Z"});
            await Call(s,HttpMethod.Post,"/api/continue",new{id="optional-fields",title="Optional fields only"});
            T.Assert((await Call(s,HttpMethod.Get,"/api/continue")).EnumerateArray().Any(x=>x.GetProperty("id").GetString()=="optional-fields"),"continue accepts optional metadata");
            await Call(s,HttpMethod.Delete,"/api/continue/optional-fields",expected:HttpStatusCode.NoContent);
            var tasks=Enumerable.Range(0,16).Select(i=>Call(s,HttpMethod.Post,"/api/continue",new{id="episode:"+i,title="x",positionSeconds=75,durationSeconds=600}));await Task.WhenAll(tasks);T.Assert((await Call(s,HttpMethod.Get,"/api/continue")).GetArrayLength()==17,"concurrent saves");
            await Call(s,HttpMethod.Delete,"/api/continue",expected:HttpStatusCode.NoContent);Stop(p);p=StartApp(root,data);s=await Login("continue-test","Test-password-4729!");T.Assert((await Call(s,HttpMethod.Get,"/api/continue")).GetArrayLength()==0,"clear persistence");
            T.Assert((await Call(s,HttpMethod.Get,"/api/profile-state/default")).GetRawText()==before,"favourite preservation");T.Assert(Encoding.UTF8.GetString(File.ReadAllBytes(Path.Combine(data,"untouched-media.mkv")))=="original media","media preservation");
            T.Pass(".NET Continue Watching API black-box regression");
        }finally{Stop(p);try{Directory.Delete(data,true);}catch{}}
    }

    static async Task SecurityIsolationBlackBox(string root){
        // Core two-account black-box isolation test against real Kestrel.
        var data=Path.Combine(Path.GetTempPath(),"myonline-isolation-net-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(data);Process? p=null;const string pw="Isolation-test-9847!";
        try{
            File.WriteAllText(Path.Combine(data,"continue-watching.json"),JsonSerializer.Serialize(new[]{Progress("legacy-root")}));p=StartApp(root,data);var admin=Client();await Call(admin,HttpMethod.Post,"/api/auth/setup",new{username="root",password=pw});
            var ua=await Call(admin,HttpMethod.Post,"/api/admin/users",new{username="alice",password=pw,role="User",enabled=true});var ub=await Call(admin,HttpMethod.Post,"/api/admin/users",new{username="bob",password=pw,role="User",enabled=true});
            var a=await Login("alice",pw);var b=await Login("bob",pw);var pa=ua.GetProperty("profileId").GetString()!;var pb=ub.GetProperty("profileId").GetString()!;
            foreach(var route in new[]{"/api/admin/overview-v2","/api/admin/users","/API/Admin/production-readiness"}){await Call(Client(),HttpMethod.Get,route,expected:HttpStatusCode.Unauthorized);await Call(a,HttpMethod.Get,route,expected:HttpStatusCode.Forbidden);await Call(admin,HttpMethod.Get,route);}
            T.Assert((await Call(a,HttpMethod.Get,"/api/continue")).GetArrayLength()==0 && (await Call(b,HttpMethod.Get,"/api/continue")).GetArrayLength()==0,"legacy progress not leaked");T.Assert((await Call(admin,HttpMethod.Get,"/api/continue")).GetArrayLength()==1,"legacy progress remains admin-owned");
            foreach(var x in new[]{(a,pb),(b,pa)}){await Call(x.Item1,HttpMethod.Get,"/api/continue",profile:x.Item2,expected:HttpStatusCode.NotFound);await Call(x.Item1,HttpMethod.Get,"/api/favourites",profile:x.Item2,expected:HttpStatusCode.NotFound);await Call(x.Item1,HttpMethod.Get,"/api/profile-state/"+x.Item2,expected:HttpStatusCode.Forbidden);}
            foreach(var c in new[]{a,b}){await Call(c,HttpMethod.Post,"/api/continue",Progress("movie:1"));await Call(c,HttpMethod.Post,"/api/continue",Progress("episode:2"));}
            await Call(a,HttpMethod.Put,$"/api/profile-state/{pa}/movie:1",new{title="Keep favourite",favourite=true});var state=(await Call(a,HttpMethod.Get,"/api/profile-state/"+pa)).GetRawText();await Call(a,HttpMethod.Delete,"/api/continue/movie%3A1",expected:HttpStatusCode.NoContent);T.Assert((await Call(a,HttpMethod.Get,"/api/continue")).GetArrayLength()==1,"A remove isolated");T.Assert((await Call(b,HttpMethod.Get,"/api/continue")).GetArrayLength()==2,"B progress preserved");await Call(a,HttpMethod.Delete,"/api/continue",expected:HttpStatusCode.NoContent);T.Assert((await Call(a,HttpMethod.Get,"/api/profile-state/"+pa)).GetRawText()==state,"clear preserves favourites");
            Stop(p);p=StartApp(root,data);a=await Login("alice",pw);b=await Login("bob",pw);T.Assert((await Call(a,HttpMethod.Get,"/api/continue")).GetArrayLength()==0 && (await Call(b,HttpMethod.Get,"/api/continue")).GetArrayLength()==2,"account progress isolation survives restart");
            // Provider ownership and credential redaction are tested with unreachable local-only endpoints; no production provider is contacted.
            await Call(a,HttpMethod.Post,"/api/providers",new{name="alice",type="xtream",baseUrl="http://127.0.0.1:1",username="alice",password="private-alice"});
            await Call(b,HttpMethod.Post,"/api/providers",new{name="bob",type="xtream",baseUrl="http://127.0.0.1:1",username="bob",password="private-bob"});
            var ap=(await Call(a,HttpMethod.Get,"/api/providers"))[0].GetProperty("id").GetString()!;
            var bp=(await Call(b,HttpMethod.Get,"/api/providers"))[0].GetProperty("id").GetString()!;
            foreach(var x in new[]{(a,bp),(b,ap),(admin,ap)}) foreach(var path in new[]{"/api/providers/"+x.Item2+"/edit","/api/channels/"+x.Item2,"/api/epg/"+x.Item2,"/api/vod/"+x.Item2+"/categories","/api/channel-preferences/"+x.Item2}) await Call(x.Item1,HttpMethod.Get,path,expected:HttpStatusCode.NotFound);
            var edit=(await Call(a,HttpMethod.Get,$"/api/providers/{ap}/edit")).GetRawText();T.Assert(!edit.Contains("private-alice"),"provider credential redaction");
            await Call(b,HttpMethod.Post,$"/api/catalogue-preferences/{ap}/bulk",new{kind="vod"},expected:HttpStatusCode.Forbidden);
            T.Pass(".NET multi-user account/profile/provider isolation black-box regression");
        }finally{Stop(p);try{Directory.Delete(data,true);}catch{}}
    }
}
