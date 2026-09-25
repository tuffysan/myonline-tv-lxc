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
        var mobileJs = File.ReadAllText(Path.Combine(root,"app/wwwroot/mobile.js"));
        var cwJs = File.ReadAllText(Path.Combine(root,"app/wwwroot/continue-watching.js"));
        var programCs = File.ReadAllText(Path.Combine(root,"app/Program.cs"));
        var updateLocalSh = File.ReadAllText(Path.Combine(root,"scripts/update-local.sh"));

        static void Has(string text,string token,string name){T.Assert(text.Contains(token,StringComparison.Ordinal),name);T.Pass(name);}

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
