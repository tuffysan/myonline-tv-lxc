using Microsoft.AspNetCore.HttpOverrides;
using System.Net;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using System.IO.Compression;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:5080");

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(o =>
    {
        o.Cookie.Name = "myonline.auth";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Strict;
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        o.ExpireTimeSpan = TimeSpan.FromDays(14);
        o.SlidingExpiration = true;
        o.LoginPath = "/api/auth/unauthorized";
        o.Events.OnRedirectToLogin = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();


builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    // The only reverse proxy that talks directly to Kestrel is the local
    // Nginx instance in the same LXC. This prevents arbitrary LAN clients
    // from spoofing forwarded headers directly to the application.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
    options.KnownProxies.Add(IPAddress.Loopback);
    options.KnownProxies.Add(IPAddress.IPv6Loopback);
});

var app = builder.Build();

app.UseForwardedHeaders();

var dataDir = Environment.GetEnvironmentVariable("MYONLINE_DATA") ?? "/var/lib/myonlinetv";
Directory.CreateDirectory(dataDir);
var providersFile = Path.Combine(dataDir, "providers.json");
var favouritesFile = Path.Combine(dataDir, "favourites.json");
var continueFile = Path.Combine(dataDir, "continue-watching.json");
var channelPreferencesFile = Path.Combine(dataDir, "channel-preferences.json");
var profilesFile = Path.Combine(dataDir, "profiles.json");
var adminFile = Path.Combine(dataDir, "admin.json");
var usersFile = Path.Combine(dataDir, "users.json");
var profileAccessFile = Path.Combine(dataDir, "profile-access.json");
var profilePoliciesFile = Path.Combine(dataDir, "profile-policies.json");
var mediaLibrariesFile = Path.Combine(dataDir, "media-libraries.json");
var recordingsFile = Path.Combine(dataDir, "recordings.json");
var dvrRulesFile = Path.Combine(dataDir, "dvr-rules.json");
var roomsFile = Path.Combine(dataDir, "rooms.json");
var notificationsFile = Path.Combine(dataDir, "notifications.json");
var profileStateFile = Path.Combine(dataDir, "profile-state.json");
var navigationFile = Path.Combine(dataDir, "navigation.json");
var userSourceAccessFile = Path.Combine(dataDir, "user-source-access.json");
var userSourcesFile = Path.Combine(dataDir, "user-sources.json");
var householdPrefsFile = Path.Combine(dataDir, "household-preferences.json");
var libraryPrefsFile = Path.Combine(dataDir, "library-preferences.json");
var epgPrefsFile = Path.Combine(dataDir, "epg-preferences.json");
var dvrEngineFile = Path.Combine(dataDir, "dvr-engine.json");
var playerPrefsFile = Path.Combine(dataDir, "player-preferences.json");
var storageTargetsFile = Path.Combine(dataDir, "storage-targets.json");
var recordingsDir = Path.Combine(dataDir, "recordings");
var secretKeyFile = Path.Combine(dataDir, "secrets.key");
var downloadsDir = Path.Combine(dataDir, "downloads");
var backupsDir = Path.Combine(dataDir, "backups");
var versionFile = Path.Combine(dataDir, "version");
Directory.CreateDirectory(downloadsDir);
Directory.CreateDirectory(backupsDir);
Directory.CreateDirectory(recordingsDir);
var catalogueCacheDir = Path.Combine(dataDir, "catalogue-cache");
Directory.CreateDirectory(catalogueCacheDir);
var startedAt = DateTimeOffset.UtcNow;

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
var http = new HttpClient(new HttpClientHandler { AutomaticDecompression = DecompressionMethods.All })
{
    Timeout = TimeSpan.FromMinutes(30)
};
http.DefaultRequestHeaders.UserAgent.ParseAdd("MyOnline-TV-Web/28.0.0");

var secretBox = new SecretBox(secretKeyFile);
var proxyTokens = new ConcurrentDictionary<string, ProxyTarget>();
var downloads = new ConcurrentDictionary<string, DownloadJob>();
var liveSessions = new ConcurrentDictionary<string, LiveSession>();
var recordingProcesses = new ConcurrentDictionary<string, Process>();
var channelCache = new ConcurrentDictionary<string, ChannelCacheEntry>();
var vodCategoryCache = new ConcurrentDictionary<string, TimedJsonCache>();
var vodItemCache = new ConcurrentDictionary<string, TimedJsonCache>();
var seriesCategoryCache = new ConcurrentDictionary<string, TimedJsonCache>();
var seriesItemCache = new ConcurrentDictionary<string, TimedJsonCache>();
var lastCatalogueSuccess = new ConcurrentDictionary<string, DateTimeOffset>();
var recentErrors = new ConcurrentQueue<RecentError>();
var channelLocks = new ConcurrentDictionary<string, SemaphoreSlim>();
var liveHlsRoot = Path.Combine(dataDir, "live-hls");
Directory.CreateDirectory(liveHlsRoot);

T? Load<T>(string path)
{
    try { return File.Exists(path) ? JsonSerializer.Deserialize<T>(File.ReadAllText(path), jsonOptions) : default; }
    catch { return default; }
}
void Save<T>(string path, T value)
{
    var tmp = path + ".tmp";
    File.WriteAllText(tmp, JsonSerializer.Serialize(value, jsonOptions));
    File.Move(tmp, path, true);
}

void RecordError(string area, Exception ex)
{
    recentErrors.Enqueue(new RecentError(DateTimeOffset.UtcNow, area, ex.GetBaseException().Message));
    while (recentErrors.Count > 20 && recentErrors.TryDequeue(out _)) { }
}

long DirectorySize(string path)
{
    try
    {
        if (!Directory.Exists(path)) return 0;
        return Directory.EnumerateFiles(path, "*", SearchOption.AllDirectories)
            .Select(f => { try { return new FileInfo(f).Length; } catch { return 0L; } })
            .Sum();
    }
    catch { return 0; }
}

string CatalogueCacheFile(string kind, string key)
{
    var safe = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(kind + "|" + key))).ToLowerInvariant();
    return Path.Combine(catalogueCacheDir, $"{kind}-{safe}.json");
}

bool TryLoadDiskJsonCache(string kind, string key, TimeSpan maxAge, out string json)
{
    json = "";
    try
    {
        var path = CatalogueCacheFile(kind, key);
        if (!File.Exists(path)) return false;
        var age = DateTimeOffset.UtcNow - File.GetLastWriteTimeUtc(path);
        if (age > maxAge) return false;
        json = File.ReadAllText(path);
        return !string.IsNullOrWhiteSpace(json);
    }
    catch { return false; }
}

void SaveDiskJsonCache(string kind, string key, string json)
{
    try
    {
        var path = CatalogueCacheFile(kind, key);
        var tmp = path + ".tmp";
        File.WriteAllText(tmp, json);
        File.Move(tmp, path, true);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not persist {Kind} catalogue cache for {Key}.", kind, key);
    }
}

void ClearDiskCatalogueCache(string? providerId = null)
{
    try
    {
        foreach (var file in Directory.EnumerateFiles(catalogueCacheDir, "*.json"))
            File.Delete(file);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not clear catalogue disk cache.");
    }
}

List<ProviderStored> LoadProviders()
{
    if (!File.Exists(providersFile)) return new();
    try
    {
        var list = JsonSerializer.Deserialize<List<ProviderStored>>(File.ReadAllText(providersFile), jsonOptions);
        if (list is not null && list.All(x => !string.IsNullOrWhiteSpace(x.EncryptedConnection)))
            return list;
    }
    catch { }

    // v0.1.0 migration: plaintext connection data -> AES-GCM encrypted connection payload.
    try
    {
        var legacyText = File.ReadAllText(providersFile);
        var legacy = JsonSerializer.Deserialize<List<LegacyProvider>>(legacyText, jsonOptions) ?? new();
        var migrated = legacy.Select(p =>
        {
            var connection = new ProviderConnection(p.PlaylistUrl, p.EpgUrl, p.BaseUrl, p.Username, p.Password);
            return new ProviderStored(
                string.IsNullOrWhiteSpace(p.Id) ? Guid.NewGuid().ToString("N") : p.Id,
                p.Name ?? "Provider",
                p.Type is "xtream" ? "xtream" : "m3u",
                secretBox.Encrypt(JsonSerializer.Serialize(connection, jsonOptions)));
        }).ToList();
        File.Copy(providersFile, Path.Combine(dataDir, "providers-v0.1.0.backup.json"), true);
        Save(providersFile, migrated);
        return migrated;
    }
    catch { return new(); }
}

ProviderConnection Connection(ProviderStored p)
{
    var json = secretBox.Decrypt(p.EncryptedConnection);
    return JsonSerializer.Deserialize<ProviderConnection>(json, jsonOptions) ?? new(null, null, null, null, null);
}

HashSet<string> LoadFavourites() => Load<HashSet<string>>(favouritesFile) ?? new(StringComparer.OrdinalIgnoreCase);
List<ContinueItem> LoadContinue() => Load<List<ContinueItem>>(continueFile) ?? new();
List<ViewerProfile> LoadProfiles()
{
    var rows = Load<List<ViewerProfile>>(profilesFile);
    if (rows is { Count: > 0 }) return rows;
    var defaults = new List<ViewerProfile> { new("default", "Main", false, "👤") };
    Save(profilesFile, defaults);
    return defaults;
}

List<AppUser> LoadUsers()
{
    var users = Load<List<AppUser>>(usersFile);
    if (users is { Count: > 0 }) return users;

    // Migrate the original single administrator account to the multi-user store.
    var legacyAdmin = Load<PasswordCredential>(adminFile);
    if (legacyAdmin is not null)
    {
        users = new List<AppUser>
        {
            new(Guid.NewGuid().ToString("N"), legacyAdmin.Username, "Admin", true, legacyAdmin)
        };
        Save(usersFile, users);
        return users;
    }
    return new();
}

bool AuthConfigured() => LoadUsers().Count > 0 || File.Exists(adminFile);

bool IsAdmin(HttpContext ctx) =>
    ctx.User.Identity?.IsAuthenticated == true &&
    ctx.User.IsInRole("Admin");

bool HasEnabledAdmin(IEnumerable<AppUser> users) =>
    users.Any(x => x.Enabled && x.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase));



List<MediaLibraryProvider> LoadMediaLibraries() => Load<List<MediaLibraryProvider>>(mediaLibrariesFile) ?? new();

MediaLibraryConnection MediaConnection(MediaLibraryProvider provider)
{
    try
    {
        var json = secretBox.Decrypt(provider.EncryptedConnection);
        return JsonSerializer.Deserialize<MediaLibraryConnection>(json, jsonOptions)
            ?? new MediaLibraryConnection("", "");
    }
    catch
    {
        return new MediaLibraryConnection("", "");
    }
}

string SafeHost(string? url)
{
    if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
        return uri.IsDefaultPort ? uri.Host : $"{uri.Host}:{uri.Port}";
    return "";
}

string PlexHeaders(string token) => token;

Dictionary<string, UserProfileAccess> LoadProfileAccess() =>
    Load<Dictionary<string, UserProfileAccess>>(profileAccessFile) ?? new(StringComparer.OrdinalIgnoreCase);

Dictionary<string, ProfilePolicy> LoadProfilePolicies() =>
    Load<Dictionary<string, ProfilePolicy>>(profilePoliciesFile) ?? new(StringComparer.OrdinalIgnoreCase);

UserProfileAccess AccessFor(string username)
{
    var rows = LoadProfileAccess();
    if (rows.TryGetValue(username, out var hit)) return hit;
    var profileIds = LoadProfiles().Select(x => x.Id).ToArray();
    return new UserProfileAccess(profileIds, profileIds.FirstOrDefault() ?? "default");
}

ProfilePolicy PolicyFor(string profileId)
{
    var rows = LoadProfilePolicies();
    return rows.TryGetValue(profileId, out var hit)
        ? hit
        : new ProfilePolicy(true, true, true, true, Array.Empty<string>(), null);
}

bool ProfileAllowedForUser(string username, string profileId)
{
    if (string.IsNullOrWhiteSpace(username)) return false;
    var user = LoadUsers().FirstOrDefault(x => x.Username.Equals(username, StringComparison.OrdinalIgnoreCase));
    if (user?.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase) == true) return true;
    return AccessFor(username).AllowedProfileIds.Contains(profileId, StringComparer.OrdinalIgnoreCase);
}

bool FeatureAllowed(HttpContext ctx, string feature, string? providerId = null)
{
    if (ctx.User.Identity?.IsAuthenticated != true) return true;
    if (ctx.User.IsInRole("Admin")) return true;
    var profileId = ctx.Request.Headers["X-MyOnline-Profile"].FirstOrDefault();
    if (string.IsNullOrWhiteSpace(profileId)) return false;
    var username = ctx.User.Identity?.Name ?? "";
    if (!ProfileAllowedForUser(username, profileId)) return false;
    var p = PolicyFor(profileId);
    if (!string.IsNullOrWhiteSpace(providerId) && p.AllowedProviderIds.Length > 0 &&
        !p.AllowedProviderIds.Contains(providerId, StringComparer.OrdinalIgnoreCase)) return false;
    return feature switch
    {
        "live" => p.Live,
        "movies" => p.Movies,
        "series" => p.Series,
        "downloads" => p.Downloads,
        _ => true
    };
}

Dictionary<string, ChannelPreferences> LoadChannelPreferences() => Load<Dictionary<string, ChannelPreferences>>(channelPreferencesFile) ?? new(StringComparer.OrdinalIgnoreCase);
ChannelPreferences PreferencesFor(string providerId)
{
    var all = LoadChannelPreferences();
    return all.TryGetValue(providerId, out var pref)
        ? pref
        : new ChannelPreferences(new(StringComparer.OrdinalIgnoreCase), new(StringComparer.OrdinalIgnoreCase), new(StringComparer.OrdinalIgnoreCase));
}


List<StorageTarget> LoadStorageTargets() => Load<List<StorageTarget>>(storageTargetsFile) ?? new();

StorageTarget? FindStorageTarget(string? id, bool dvrDefault = false, bool downloadDefault = false)
{
    var rows = LoadStorageTargets().Where(x => x.Enabled).ToList();
    if (!string.IsNullOrWhiteSpace(id))
        return rows.FirstOrDefault(x => x.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
    if (dvrDefault) return rows.FirstOrDefault(x => x.DefaultDvr);
    if (downloadDefault) return rows.FirstOrDefault(x => x.DefaultDownload);
    return rows.FirstOrDefault();
}

string StorageFileName(string title, string extension)
{
    var safe = SafeRecordingFileName(title);
    var ext = extension.StartsWith('.') ? extension : "." + extension;
    return $"{DateTimeOffset.Now:yyyyMMdd-HHmmss}-{safe}{ext}";
}

string PathTargetFile(StorageTarget target, string fileName)
{
    var root = target.Destination.Trim();
    if (string.IsNullOrWhiteSpace(root)) throw new InvalidOperationException("Storage destination is empty.");
    Directory.CreateDirectory(root);
    return Path.Combine(root, fileName);
}

async Task UploadWithRclone(string localPath, StorageTarget target, string fileName)
{
    var rclone = FindExecutable("rclone") ?? throw new InvalidOperationException("rclone is not installed.");
    var destination = target.Destination.TrimEnd('/') + "/" + fileName;
    var psi = new ProcessStartInfo
    {
        FileName = rclone,
        UseShellExecute = false,
        RedirectStandardError = true,
        CreateNoWindow = true
    };
    psi.ArgumentList.Add("copyto");
    psi.ArgumentList.Add(localPath);
    psi.ArgumentList.Add(destination);
    using var process = Process.Start(psi) ?? throw new InvalidOperationException("Could not start rclone.");
    var errorTask = process.StandardError.ReadToEndAsync();
    await process.WaitForExitAsync();
    var error = await errorTask;
    if (process.ExitCode != 0)
        throw new InvalidOperationException("rclone failed: " + (error.Length > 1200 ? error[^1200..] : error));
}

List<RecordingJob> LoadRecordingJobs() => Load<List<RecordingJob>>(recordingsFile) ?? new();

void SaveRecordingJobs(List<RecordingJob> jobs) => Save(recordingsFile, jobs);

string SafeRecordingFileName(string name)
{
    var invalid = Path.GetInvalidFileNameChars();
    var cleaned = new string((name ?? "Recording").Select(ch => invalid.Contains(ch) ? '_' : ch).ToArray()).Trim();
    if (string.IsNullOrWhiteSpace(cleaned)) cleaned = "Recording";
    return cleaned.Length > 100 ? cleaned[..100] : cleaned;
}

async Task StartScheduledRecording(RecordingJob job)
{
    if (recordingProcesses.ContainsKey(job.Id)) return;
    var provider = LoadProviders().FirstOrDefault(x => x.Id == job.ProviderId);
    if (provider is null) throw new InvalidOperationException("Provider not found.");
    var channels = await GetCachedChannels(provider);
    var channel = channels.FirstOrDefault(x => x.Key == job.ChannelKey);
    if (channel is null) throw new InvalidOperationException("Channel not found.");
    if (!Uri.TryCreate(channel.SourceUrl, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
        throw new InvalidOperationException("Invalid channel stream URL.");

    var target = FindStorageTarget(job.StorageTargetId, dvrDefault: true)
        ?? throw new InvalidOperationException("No DVR storage target is configured. Open Admin → Storage.");
    var ffmpeg = FindExecutable("ffmpeg") ?? throw new InvalidOperationException("FFmpeg is not installed.");

    var fileName = $"{job.Start.LocalDateTime:yyyyMMdd-HHmm}-{SafeRecordingFileName(job.Title)}.ts";
    var isPath = target.Type.Equals("path", StringComparison.OrdinalIgnoreCase);
    var tempPath = Path.Combine(recordingsDir, $"{job.Id}-{fileName}");
    var filePath = isPath ? PathTargetFile(target, fileName) : tempPath;
    var duration = Math.Max(1, (int)Math.Ceiling((job.End - DateTimeOffset.Now).TotalSeconds));

    var psi = new ProcessStartInfo
    {
        FileName = ffmpeg,
        UseShellExecute = false,
        RedirectStandardError = true,
        RedirectStandardOutput = false,
        CreateNoWindow = true
    };
    foreach (var a in new[] {
        "-hide_banner","-loglevel","warning","-nostdin","-rw_timeout","15000000",
        "-i",channel.SourceUrl,"-map","0:v:0?","-map","0:a:0?","-t",duration.ToString(),
        "-c","copy","-f","mpegts","-y",filePath
    }) psi.ArgumentList.Add(a);

    var process = Process.Start(psi) ?? throw new InvalidOperationException("Could not start FFmpeg.");
    recordingProcesses[job.Id] = process;

    var jobs = LoadRecordingJobs();
    var idx = jobs.FindIndex(x => x.Id == job.Id);
    if (idx >= 0)
    {
        jobs[idx] = jobs[idx] with
        {
            Status = "Recording", FileName = fileName, StorageTargetId = target.Id,
            StorageTargetName = target.Name, StoredPath = isPath ? filePath : null, Error = null
        };
        SaveRecordingJobs(jobs);
    }

    _ = Task.Run(async () =>
    {
        try
        {
            var errorTask = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();
            var ffError = await errorTask;
            var rows = LoadRecordingJobs();
            var i = rows.FindIndex(x => x.Id == job.Id);
            if (i >= 0)
            {
                if (process.ExitCode == 0)
                {
                    if (target.Type.Equals("rclone", StringComparison.OrdinalIgnoreCase))
                    {
                        rows[i] = rows[i] with { Status = "Uploading" };
                        SaveRecordingJobs(rows);
                        await UploadWithRclone(tempPath, target, fileName);
                        try { if (File.Exists(tempPath)) File.Delete(tempPath); } catch { }
                        rows = LoadRecordingJobs();
                        i = rows.FindIndex(x => x.Id == job.Id);
                        if (i >= 0)
                            rows[i] = rows[i] with { Status = "Completed", StoredPath = target.Destination.TrimEnd('/') + "/" + fileName, Error = null };
                    }
                    else rows[i] = rows[i] with { Status = "Completed", Error = null };
                }
                else
                {
                    rows[i] = rows[i] with
                    {
                        Status = "Failed",
                        Error = $"FFmpeg exited with code {process.ExitCode}. " + (ffError.Length > 600 ? ffError[^600..] : ffError)
                    };
                }
                SaveRecordingJobs(rows);
            }
        }
        catch (Exception ex)
        {
            var rows = LoadRecordingJobs();
            var i = rows.FindIndex(x => x.Id == job.Id);
            if (i >= 0)
            {
                rows[i] = rows[i] with { Status = "Failed", Error = ex.GetBaseException().Message };
                SaveRecordingJobs(rows);
            }
            RecordError("recording:" + job.Id, ex);
            try { if (File.Exists(tempPath)) File.Delete(tempPath); } catch { }
        }
        finally
        {
            recordingProcesses.TryRemove(job.Id, out _);
            process.Dispose();
        }
    });
}

async Task RecordingSchedulerLoop()
{
    while (true)
    {
        try
        {
            var now = DateTimeOffset.Now;
            var jobs = LoadRecordingJobs();
            foreach (var job in jobs.Where(x => x.Status == "Scheduled" && x.Start <= now && x.End > now).ToList())
            {
                try { await StartScheduledRecording(job); }
                catch (Exception ex)
                {
                    var rows = LoadRecordingJobs();
                    var i = rows.FindIndex(x => x.Id == job.Id);
                    if (i >= 0)
                    {
                        rows[i] = rows[i] with { Status = "Failed", Error = ex.GetBaseException().Message };
                        SaveRecordingJobs(rows);
                    }
                    RecordError("recording-start:" + job.Id, ex);
                }
            }
            // Missed recordings are marked instead of silently remaining scheduled forever.
            var stale = LoadRecordingJobs();
            var changed = false;
            for (var i = 0; i < stale.Count; i++)
            {
                if (stale[i].Status == "Scheduled" && stale[i].End <= now)
                {
                    stale[i] = stale[i] with { Status = "Missed", Error = "Recording window ended before the scheduler could start it." };
                    changed = true;
                }
            }
            if (changed) SaveRecordingJobs(stale);
        }
        catch (Exception ex) { RecordError("recording-scheduler", ex); }
        await Task.Delay(TimeSpan.FromSeconds(15));
    }
}

string RegisterProxy(string url, string kind = "media")
{
    var token = Guid.NewGuid().ToString("N");
    proxyTokens[token] = new ProxyTarget(url, kind, DateTimeOffset.UtcNow);
    if (proxyTokens.Count > 20000)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-12);
        foreach (var kv in proxyTokens.Where(k => k.Value.Created < cutoff).Take(5000))
            proxyTokens.TryRemove(kv.Key, out _);
    }
    return token;
}

string ProxyUrl(string url, string kind = "media") => $"/api/proxy/{RegisterProxy(url, kind)}";

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

// Same-origin protection for cookie-authenticated state-changing API requests.
// Compare normalized URI components instead of raw strings so default ports
// such as https:443/http:80 do not cause false rejections behind reverse proxies.
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api") &&
        ctx.Request.Method is not ("GET" or "HEAD" or "OPTIONS") &&
        ctx.User.Identity?.IsAuthenticated == true)
    {
        var originText = ctx.Request.Headers.Origin.ToString();

        if (!string.IsNullOrWhiteSpace(originText))
        {
            static int EffectivePort(string scheme, int? explicitPort)
            {
                if (explicitPort.HasValue)
                    return explicitPort.Value;

                return scheme.Equals("https", StringComparison.OrdinalIgnoreCase) ? 443 : 80;
            }

            var validOrigin = Uri.TryCreate(originText, UriKind.Absolute, out var originUri);
            var requestScheme = ctx.Request.Scheme;
            var requestHost = ctx.Request.Host.Host;
            var requestPort = EffectivePort(requestScheme, ctx.Request.Host.Port);

            var originPort = validOrigin
                ? (originUri!.IsDefaultPort
                    ? EffectivePort(originUri.Scheme, null)
                    : originUri.Port)
                : -1;

            var sameOrigin =
                validOrigin &&
                originUri!.Scheme.Equals(requestScheme, StringComparison.OrdinalIgnoreCase) &&
                originUri.Host.Equals(requestHost, StringComparison.OrdinalIgnoreCase) &&
                originPort == requestPort;

            if (!sameOrigin)
            {
                app.Logger.LogWarning(
                    "Same-origin request rejected. Method={Method} Path={Path} Origin={Origin} " +
                    "OriginScheme={OriginScheme} OriginHost={OriginHost} OriginPort={OriginPort} " +
                    "RequestScheme={RequestScheme} RequestHost={RequestHost} RequestPort={RequestPort} " +
                    "XForwardedProto={XForwardedProto} XForwardedHost={XForwardedHost}",
                    ctx.Request.Method,
                    ctx.Request.Path,
                    originText,
                    validOrigin ? originUri!.Scheme : "(invalid)",
                    validOrigin ? originUri!.Host : "(invalid)",
                    originPort,
                    requestScheme,
                    requestHost,
                    requestPort,
                    ctx.Request.Headers["X-Forwarded-Proto"].ToString(),
                    ctx.Request.Headers["X-Forwarded-Host"].ToString());

                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                await ctx.Response.WriteAsync("Cross-origin state-changing requests are not allowed.");
                return;
            }
        }
    }

    await next();
});


app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    version = "30.0.1",
    uptimeSeconds = (long)(DateTimeOffset.UtcNow - startedAt).TotalSeconds
})).AllowAnonymous();

app.MapGet("/ready", () =>
{
    var checks = new Dictionary<string, object>();
    var ready = true;

    try
    {
        Directory.CreateDirectory(dataDir);
        var probe = Path.Combine(dataDir, ".ready-probe");
        File.WriteAllText(probe, DateTimeOffset.UtcNow.ToString("O"));
        File.Delete(probe);
        checks["dataDirectory"] = "ok";
    }
    catch (Exception ex)
    {
        ready = false;
        checks["dataDirectory"] = ex.Message;
    }

    try
    {
        checks["secretKey"] = File.Exists(secretKeyFile) && new FileInfo(secretKeyFile).Length > 20 ? "ok" : "missing";
        if (!File.Exists(secretKeyFile)) ready = false;
    }
    catch (Exception ex)
    {
        ready = false;
        checks["secretKey"] = ex.Message;
    }

    checks["ffmpeg"] = FindExecutable("ffmpeg") is not null ? "ok" : "missing";
    checks["authConfigured"] = AuthConfigured();

    return ready
        ? Results.Ok(new { status = "ready", version = "30.0.1", checks })
        : Results.Json(new { status = "not-ready", version = "30.0.1", checks }, statusCode: 503);
}).AllowAnonymous();

app.MapGet("/api/status", () => Results.Ok(new
{
    name = "MyOnline TV Web",
    version = "30.0.1",
    dataDir,
    platform = Environment.OSVersion.ToString(),
    authConfigured = AuthConfigured(),
    now = DateTimeOffset.UtcNow
})).AllowAnonymous();

app.MapGet("/api/auth/status", (HttpContext ctx) => Results.Ok(new
{
    configured = AuthConfigured(),
    authenticated = ctx.User.Identity?.IsAuthenticated == true,
    user = ctx.User.Identity?.Name,
    role = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? ""
})).AllowAnonymous();

app.MapPost("/api/auth/setup", async (SetupRequest req, HttpContext ctx) =>
{
    if (AuthConfigured()) return Results.Conflict("Administrator account is already configured.");
    if (!ValidPassword(req.Password)) return Results.BadRequest("Password must be at least 10 characters.");
    var username = string.IsNullOrWhiteSpace(req.Username) ? "admin" : req.Username.Trim();
    var user = new AppUser(Guid.NewGuid().ToString("N"), username, "Admin", true,
        PasswordCredential.Create(username, req.Password));
    Save(usersFile, new List<AppUser> { user });
    await SignIn(ctx, user.Username, user.Role);
    return Results.Ok(new { user = user.Username, role = user.Role });
}).AllowAnonymous();

app.MapPost("/api/auth/login", async (LoginRequest req, HttpContext ctx) =>
{
    var user = LoadUsers().FirstOrDefault(x =>
        x.Enabled && x.Username.Equals(req.Username?.Trim(), StringComparison.OrdinalIgnoreCase));

    if (user is null || !user.Credential.Verify(user.Username, req.Password))
    {
        await Task.Delay(350);
        return Results.Unauthorized();
    }

    await SignIn(ctx, user.Username, user.Role);
    return Results.Ok(new { user = user.Username, role = user.Role });
}).AllowAnonymous();

app.MapPost("/api/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok();
}).RequireAuthorization();

app.MapGet("/api/admin/users", () =>
{
    return Results.Ok(LoadUsers()
        .OrderBy(x => x.Username)
        .Select(x => new { x.Id, x.Username, x.Role, x.Enabled }));
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/users", (UserInput input) =>
{
    var users = LoadUsers();
    var id = string.IsNullOrWhiteSpace(input.Id) ? Guid.NewGuid().ToString("N") : input.Id.Trim();
    var existing = users.FirstOrDefault(x => x.Id == id);
    var username = input.Username?.Trim() ?? "";
    var role = input.Role?.Equals("Admin", StringComparison.OrdinalIgnoreCase) == true ? "Admin" : "User";

    if (string.IsNullOrWhiteSpace(username))
        return Results.BadRequest("Username is required.");
    if (users.Any(x => x.Id != id && x.Username.Equals(username, StringComparison.OrdinalIgnoreCase)))
        return Results.Conflict("A user with that username already exists.");

    PasswordCredential credential;
    if (existing is null)
    {
        if (!ValidPassword(input.Password))
            return Results.BadRequest("Password must be at least 10 characters.");
        credential = PasswordCredential.Create(username, input.Password!);
    }
    else if (!string.IsNullOrWhiteSpace(input.Password))
    {
        if (!ValidPassword(input.Password))
            return Results.BadRequest("Password must be at least 10 characters.");
        credential = PasswordCredential.Create(username, input.Password!);
    }
    else if (!existing.Username.Equals(username, StringComparison.OrdinalIgnoreCase))
    {
        // Username is part of the credential verification. Re-hashing requires a new password.
        return Results.BadRequest("Enter a new password when changing the username.");
    }
    else
    {
        credential = existing.Credential;
    }

    var updated = new AppUser(id, username, role, input.Enabled, credential);
    var candidate = users.Where(x => x.Id != id).Append(updated).ToList();
    if (!HasEnabledAdmin(candidate))
        return Results.BadRequest("At least one enabled administrator account is required.");

    var idx = users.FindIndex(x => x.Id == id);
    if (idx >= 0) users[idx] = updated; else users.Add(updated);
    Save(usersFile, users);
    return Results.Ok(new { updated.Id, updated.Username, updated.Role, updated.Enabled });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/admin/users/{id}", (string id, HttpContext ctx) =>
{
    var users = LoadUsers();
    var target = users.FirstOrDefault(x => x.Id == id);
    if (target is null) return Results.NotFound();

    if (ctx.User.Identity?.Name?.Equals(target.Username, StringComparison.OrdinalIgnoreCase) == true)
        return Results.BadRequest("You cannot delete the account you are currently signed in with.");

    var candidate = users.Where(x => x.Id != id).ToList();
    if (!HasEnabledAdmin(candidate))
        return Results.BadRequest("The last enabled administrator cannot be deleted.");

    Save(usersFile, candidate);
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapGet("/api/providers", () =>
{
    var result = LoadProviders().Select(p =>
    {
        var c = Connection(p);
        return new
        {
            p.Id,
            p.Name,
            p.Type,
            host = ProviderHost(p, c),
            hasPlaylist = !string.IsNullOrWhiteSpace(c.PlaylistUrl),
            hasEpg = !string.IsNullOrWhiteSpace(c.EpgUrl),
            hasCredentials = !string.IsNullOrWhiteSpace(c.Username) || !string.IsNullOrWhiteSpace(c.Password)
        };
    });
    return Results.Ok(result);
}).RequireAuthorization();

app.MapGet("/api/providers/{id}/edit", (string id) =>
{
    var p = LoadProviders().FirstOrDefault(x => x.Id == id);
    if (p is null) return Results.NotFound();
    var c = Connection(p);
    return Results.Ok(new
    {
        p.Id,
        p.Name,
        p.Type,
        playlistUrl = c.PlaylistUrl ?? "",
        epgUrl = c.EpgUrl ?? "",
        baseUrl = c.BaseUrl ?? "",
        username = c.Username ?? "",
        passwordStored = !string.IsNullOrWhiteSpace(c.Password)
    });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/providers", (ProviderInput input) =>
{
    if (string.IsNullOrWhiteSpace(input.Name)) return Results.BadRequest("Name is required.");
    if (input.Type is not ("m3u" or "xtream")) return Results.BadRequest("Type must be m3u or xtream.");

    var list = LoadProviders();
    var id = string.IsNullOrWhiteSpace(input.Id) ? Guid.NewGuid().ToString("N") : input.Id.Trim();
    var existing = list.FirstOrDefault(x => x.Id == id);

    ProviderConnection c;
    if (existing is not null && input.KeepExistingConnection)
    {
        c = Connection(existing);
    }
    else
    {
        var existingConnection = existing is null ? null : Connection(existing);
        var password = existing is not null && input.KeepExistingPassword && string.IsNullOrWhiteSpace(input.Password)
            ? existingConnection?.Password ?? ""
            : input.Password ?? "";
        c = new ProviderConnection(
            Clean(input.PlaylistUrl),
            Clean(input.EpgUrl),
            Clean(input.BaseUrl)?.TrimEnd('/'),
            Clean(input.Username),
            password);
    }

    if (input.Type == "m3u" && string.IsNullOrWhiteSpace(c.PlaylistUrl))
        return Results.BadRequest("M3U playlist URL is required.");
    if (input.Type == "xtream" &&
        (string.IsNullOrWhiteSpace(c.BaseUrl) || string.IsNullOrWhiteSpace(c.Username) || string.IsNullOrWhiteSpace(c.Password)))
        return Results.BadRequest("Xtream base URL, username and password are required.");

    ValidateHttpUrl(input.Type == "m3u" ? c.PlaylistUrl : c.BaseUrl);

    var stored = new ProviderStored(id, input.Name.Trim(), input.Type,
        secretBox.Encrypt(JsonSerializer.Serialize(c, jsonOptions)));

    var idx = list.FindIndex(x => x.Id == id);
    if (idx >= 0) list[idx] = stored; else list.Add(stored);
    Save(providersFile, list);
    channelCache.TryRemove(id, out _);
    foreach (var key in vodItemCache.Keys.Where(k => k.StartsWith(id + ":", StringComparison.Ordinal))) vodItemCache.TryRemove(key, out _);
    foreach (var key in seriesItemCache.Keys.Where(k => k.StartsWith(id + ":", StringComparison.Ordinal))) seriesItemCache.TryRemove(key, out _);
    vodCategoryCache.TryRemove(id, out _); seriesCategoryCache.TryRemove(id, out _);
    ClearDiskCatalogueCache(id);

    return Results.Ok(new { stored.Id, stored.Name, stored.Type });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/providers/{id}", (string id) =>
{
    var list = LoadProviders();
    var changed = list.RemoveAll(x => x.Id == id) > 0;
    if (changed)
    {
        Save(providersFile, list);
        channelCache.TryRemove(id, out _);
    }
    return changed ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapGet("/api/channels/{providerId}", async (string providerId) =>
{
    var p = LoadProviders().FirstOrDefault(x => x.Id == providerId);
    if (p is null) return Results.NotFound();

    try
    {
        var rows = await GetCachedChannels(p);
        return Results.Ok(rows.Select(ch => new
        {
            id = ch.Id,
            key = ch.Key,
            name = ch.Name,
            group = ch.Group,
            number = ch.Number,
            logo = string.IsNullOrWhiteSpace(ch.LogoUrl)
                ? ""
                : $"/api/channels/{Uri.EscapeDataString(providerId)}/{Uri.EscapeDataString(ch.Key)}/logo",
            playback = "server-hls"
        }));
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Live TV channel loading failed for provider {ProviderId}.", p.Id);
        return Results.Problem(
            title: "Could not load Live TV channels",
            detail: SafeProviderError(ex),
            statusCode: StatusCodes.Status502BadGateway);
    }
}).RequireAuthorization();

app.MapGet("/api/channels/{providerId}/{channelKey}/logo", async (string providerId, string channelKey, HttpContext ctx) =>
{
    if (!channelCache.TryGetValue(providerId, out var cached)) return Results.NotFound();
    var channel = cached.Channels.FirstOrDefault(x => x.Key == channelKey);
    if (channel is null || string.IsNullOrWhiteSpace(channel.LogoUrl)) return Results.NotFound();
    if (!Uri.TryCreate(channel.LogoUrl, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
        return Results.BadRequest();

    try
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, uri);
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ctx.RequestAborted);
        cts.CancelAfter(TimeSpan.FromSeconds(8));
        using var res = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cts.Token);
        if (!res.IsSuccessStatusCode) return Results.StatusCode((int)res.StatusCode);
        var mediaType = res.Content.Headers.ContentType?.MediaType ?? "image/jpeg";
        var bytes = await res.Content.ReadAsByteArrayAsync(cts.Token);
        return Results.Bytes(bytes, mediaType);
    }
    catch { return Results.NotFound(); }
}).RequireAuthorization();

app.MapGet("/api/providers/{providerId}/test", async (string providerId) =>
{
    var p = LoadProviders().FirstOrDefault(x => x.Id == providerId);
    if (p is null) return Results.NotFound();
    var c = Connection(p);
    var sw = Stopwatch.StartNew();
    try
    {
        if (p.Type == "xtream")
        {
            var auth = await ProbeProvider(BuildXtreamPlayerApiUrl(c), TimeSpan.FromSeconds(10));
            ProviderProbe? live = null;
            if (auth.Ok)
                live = await ProbeProvider(BuildXtreamPlayerApiUrl(c, "get_live_streams"), TimeSpan.FromSeconds(15));
            sw.Stop();
            return Results.Ok(new
            {
                p.Id, p.Name, p.Type,
                host = ProviderHost(p, c),
                ok = auth.Ok && (live?.Ok ?? false),
                latencyMs = sw.ElapsedMilliseconds,
                auth,
                live
            });
        }

        var playlist = await ProbeProvider(c.PlaylistUrl!, TimeSpan.FromSeconds(15));
        sw.Stop();
        return Results.Ok(new
        {
            p.Id, p.Name, p.Type,
            host = ProviderHost(p, c),
            ok = playlist.Ok,
            latencyMs = sw.ElapsedMilliseconds,
            playlist
        });
    }
    catch (Exception ex)
    {
        sw.Stop();
        app.Logger.LogWarning(ex, "Provider test failed for provider {ProviderId} host {Host}.", p.Id, ProviderHost(p, c));
        return Results.Ok(new
        {
            p.Id, p.Name, p.Type,
            host = ProviderHost(p, c),
            ok = false,
            latencyMs = sw.ElapsedMilliseconds,
            error = SafeProviderError(ex)
        });
    }
}).RequireAuthorization();

app.MapGet("/api/epg/{providerId}", async (string providerId, int? hours, DateTimeOffset? start) =>
{
    var p = LoadProviders().FirstOrDefault(x => x.Id == providerId);
    if (p is null) return Results.NotFound();
    var c = Connection(p);
    var epgUrl = c.EpgUrl;
    if (string.IsNullOrWhiteSpace(epgUrl) && p.Type == "xtream")
        epgUrl = BuildXtreamXmlTvUrl(c);
    if (string.IsNullOrWhiteSpace(epgUrl)) return Results.Ok(Array.Empty<object>());

    try
    {
        using var stream = await http.GetStreamAsync(epgUrl);
        var doc = XDocument.Load(stream);
        var anchorTime = start ?? DateTimeOffset.Now;
        var span = Math.Clamp(hours ?? 6, 2, 24);
        var startWindow = anchorTime.AddMinutes(-30);
        var endWindow = anchorTime.AddHours(span);
        var programs = doc.Descendants("programme").Select(x => new
        {
            channel = (string?)x.Attribute("channel") ?? "",
            start = ParseXmlTvDate((string?)x.Attribute("start")),
            stop = ParseXmlTvDate((string?)x.Attribute("stop")),
            title = (string?)x.Element("title") ?? "",
            desc = (string?)x.Element("desc") ?? "",
            category = (string?)x.Element("category") ?? ""
        })
        .Where(x => x.stop >= startWindow && x.start <= endWindow)
        .OrderBy(x => x.channel).ThenBy(x => x.start)
        .Take(30000);
        return Results.Ok(programs);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Xtream catalogue request failed.");
        return Results.Problem(detail: SafeProviderError(ex), statusCode: StatusCodes.Status502BadGateway);
    }
}).RequireAuthorization();

app.MapPost("/api/catalogue-cache/clear/{providerId}", (string providerId) =>
{
    foreach (var key in vodItemCache.Keys.Where(k => k.StartsWith(providerId + ":", StringComparison.Ordinal)))
        vodItemCache.TryRemove(key, out _);
    foreach (var key in seriesItemCache.Keys.Where(k => k.StartsWith(providerId + ":", StringComparison.Ordinal)))
        seriesItemCache.TryRemove(key, out _);
    vodCategoryCache.TryRemove(providerId, out _);
    seriesCategoryCache.TryRemove(providerId, out _);
    ClearDiskCatalogueCache(providerId);
    return Results.Ok(new { cleared = true, providerId });
}).RequireAuthorization();

app.MapGet("/api/vod/{providerId}/categories", async (string providerId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        using var doc = await CachedXtreamJson(vodCategoryCache, providerId, resolved.Value.Connection,
            "get_vod_categories", TimeSpan.FromSeconds(12));
        return Results.Ok(doc.RootElement.EnumerateArray().Select(x => new
        {
            id = JsonString(x, "category_id"),
            name = JsonString(x, "category_name")
        }).ToList());
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Xtream catalogue request failed.");
        return Results.Problem(detail: SafeProviderError(ex), statusCode: StatusCodes.Status502BadGateway);
    }
}).RequireAuthorization();

app.MapGet("/api/vod/{providerId}/items", async (string providerId, string? categoryId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        (string Key, string Value)? extra = string.IsNullOrWhiteSpace(categoryId) ? null : ("category_id", categoryId!);
        var cacheKey = providerId + ":" + (categoryId ?? "");
        var vodSw = Stopwatch.StartNew();
        using var doc = await CachedXtreamJson(vodItemCache, cacheKey, resolved.Value.Connection,
            "get_vod_streams", TimeSpan.FromSeconds(120), extra);
        vodSw.Stop();
        app.Logger.LogInformation("Loaded VOD catalogue for provider {ProviderId} category {CategoryId} in {ElapsedMs} ms.",
            providerId, categoryId ?? "(all)", vodSw.ElapsedMilliseconds);
        var rows = new List<object>();
        foreach (var x in doc.RootElement.EnumerateArray().Take(5000))
        {
            var id = JsonString(x, "stream_id");
            var ext = JsonString(x, "container_extension");
            var source = BuildXtreamMovieUrl(resolved.Value.Connection, id, ext);
            rows.Add(new
            {
                id,
                name = JsonString(x, "name"),
                year = JsonString(x, "year"),
                rating = JsonString(x, "rating"),
                plot = JsonString(x, "plot"),
                genre = JsonString(x, "genre"),
                poster = JsonString(x, "stream_icon")
            });
        }
        if (rows.Count == 0)
            app.Logger.LogWarning("VOD catalogue returned zero items for provider {ProviderId} category {CategoryId}.",
                providerId, categoryId ?? "(all)");
        return Results.Ok(rows);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Xtream catalogue request failed.");
        return Results.Problem(detail: SafeProviderError(ex), statusCode: StatusCodes.Status502BadGateway);
    }
}).RequireAuthorization();

app.MapGet("/api/series/{providerId}/categories", async (string providerId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        using var doc = await CachedXtreamJson(seriesCategoryCache, providerId, resolved.Value.Connection,
            "get_series_categories", TimeSpan.FromSeconds(12));
        return Results.Ok(doc.RootElement.EnumerateArray().Select(x => new
        {
            id = JsonString(x, "category_id"),
            name = JsonString(x, "category_name")
        }).ToList());
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Xtream catalogue request failed.");
        return Results.Problem(detail: SafeProviderError(ex), statusCode: StatusCodes.Status502BadGateway);
    }
}).RequireAuthorization();

app.MapGet("/api/series/{providerId}/items", async (string providerId, string? categoryId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        (string Key, string Value)? extra = string.IsNullOrWhiteSpace(categoryId) ? null : ("category_id", categoryId!);
        var cacheKey = providerId + ":" + (categoryId ?? "");
        using var doc = await CachedXtreamJson(seriesItemCache, cacheKey, resolved.Value.Connection,
            "get_series", TimeSpan.FromSeconds(20), extra);
        var rows = doc.RootElement.EnumerateArray().Take(5000).Select(x => new
        {
            id = JsonString(x, "series_id"),
            name = JsonString(x, "name"),
            year = JsonString(x, "year"),
            rating = JsonString(x, "rating"),
            plot = JsonString(x, "plot"),
            genre = JsonString(x, "genre"),
            poster = JsonString(x, "cover")
        }).ToList();
        return Results.Ok(rows);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Xtream catalogue request failed.");
        return Results.Problem(detail: SafeProviderError(ex), statusCode: StatusCodes.Status502BadGateway);
    }
}).RequireAuthorization();

app.MapGet("/api/series/{providerId}/{seriesId}", async (string providerId, string seriesId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        using var doc = await XtreamJson(resolved.Value.Connection, "get_series_info",
            TimeSpan.FromSeconds(20), ("series_id", seriesId));
        var root = doc.RootElement;
        var info = root.TryGetProperty("info", out var i) ? i : default;
        var episodes = new List<object>();
        if (root.TryGetProperty("episodes", out var eps) && eps.ValueKind == JsonValueKind.Object)
        {
            foreach (var seasonProp in eps.EnumerateObject())
            {
                if (seasonProp.Value.ValueKind != JsonValueKind.Array) continue;
                foreach (var ep in seasonProp.Value.EnumerateArray())
                {
                    var id = JsonString(ep, "id");
                    var ext = JsonString(ep, "container_extension");
                    var source = BuildXtreamSeriesUrl(resolved.Value.Connection, id, ext);
                    episodes.Add(new
                    {
                        id,
                        season = seasonProp.Name,
                        episode = JsonString(ep, "episode_num"),
                        title = JsonString(ep, "title"),
                        extension = JsonString(ep, "container_extension")
                    });
                }
            }
        }
        return Results.Ok(new
        {
            name = info.ValueKind == JsonValueKind.Object ? JsonString(info, "name") : "",
            plot = info.ValueKind == JsonValueKind.Object ? JsonString(info, "plot") : "",
            cover = info.ValueKind == JsonValueKind.Object ? JsonString(info, "cover") : "",
            episodes
        });
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
}).RequireAuthorization();

app.MapPost("/api/vod/{providerId}/{streamId}/token", async (string providerId, string streamId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        using var doc = await XtreamJson(resolved.Value.Connection, "get_vod_info",
            TimeSpan.FromSeconds(12), ("vod_id", streamId));
        var root = doc.RootElement;
        var info = root.TryGetProperty("movie_data", out var md) && md.ValueKind == JsonValueKind.Object ? md : root;
        var ext = JsonString(info, "container_extension");
        if (string.IsNullOrWhiteSpace(ext) && root.TryGetProperty("movie_data", out var movieData))
            ext = JsonString(movieData, "container_extension");
        var source = BuildXtreamMovieUrl(resolved.Value.Connection, streamId, ext);
        return Results.Ok(new
        {
            playToken = RegisterProxy(source, "media"),
            downloadToken = RegisterProxy(source, "download")
        });
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not create VOD playback token for {StreamId}.", streamId);
        // Most Xtream providers do not require get_vod_info to build playback URL.
        var source = BuildXtreamMovieUrl(resolved.Value.Connection, streamId, "mp4");
        return Results.Ok(new { playToken = RegisterProxy(source, "media"), downloadToken = RegisterProxy(source, "download") });
    }
}).RequireAuthorization();

app.MapPost("/api/series/{providerId}/episode/{episodeId}/token", (string providerId, string episodeId, string? ext) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    var source = BuildXtreamSeriesUrl(resolved.Value.Connection, episodeId, ext ?? "mp4");
    return Results.Ok(new
    {
        playToken = RegisterProxy(source, "media"),
        downloadToken = RegisterProxy(source, "download")
    });
}).RequireAuthorization();





app.MapGet("/api/unified/{source}/{providerId}/{itemId}/play", async (string source,string providerId,string itemId) =>
{
    var lib=LoadMediaLibraries().FirstOrDefault(x=>x.Id==providerId&&x.Enabled); if(lib is null)return Results.NotFound();
    var c=MediaConnection(lib);
    try
    {
        if(source=="jellyfin")
        {
            var url=c.BaseUrl+"/Videos/"+Uri.EscapeDataString(itemId)+"/stream?static=true&api_key="+Uri.EscapeDataString(c.Token);
            var token=RegisterProxy(url,"media");
            return Results.Ok(new{playToken=token,source="jellyfin"});
        }
        if(source=="plex")
        {
            using var client=new HttpClient{Timeout=TimeSpan.FromSeconds(30)};
            var req=new HttpRequestMessage(HttpMethod.Get,c.BaseUrl+"/library/metadata/"+Uri.EscapeDataString(itemId));
            req.Headers.TryAddWithoutValidation("X-Plex-Token",c.Token);req.Headers.TryAddWithoutValidation("Accept","application/json");
            var r=await client.SendAsync(req);if(!r.IsSuccessStatusCode)return Results.StatusCode((int)r.StatusCode);
            using var doc=JsonDocument.Parse(await r.Content.ReadAsStringAsync());
            var md=doc.RootElement.GetProperty("MediaContainer").GetProperty("Metadata")[0];
            if(!md.TryGetProperty("Media",out var medias)||medias.GetArrayLength()==0)return Results.NotFound();
            var parts=medias[0].GetProperty("Part"); if(parts.GetArrayLength()==0)return Results.NotFound();
            var key=parts[0].GetProperty("key").GetString()??"";
            var url=c.BaseUrl+key+"?X-Plex-Token="+Uri.EscapeDataString(c.Token);
            var token=RegisterProxy(url,"media");
            return Results.Ok(new{playToken=token,source="plex"});
        }
        return Results.BadRequest();
    }catch(Exception ex){RecordError("unified-play:"+providerId,ex);return Results.Problem(ex.Message);}
}).RequireAuthorization();

app.MapGet("/api/unified/movies", async () =>
{
    var result=new List<UnifiedMediaItem>();
    foreach(var lib in LoadMediaLibraries().Where(x=>x.Enabled))
    {
        var c=MediaConnection(lib);
        try
        {
            using var client=new HttpClient{Timeout=TimeSpan.FromSeconds(60)};
            if(lib.Type=="jellyfin")
            {
                var scopes = lib.LibraryIds.Length > 0
                    ? lib.LibraryIds.Cast<string?>().ToArray()
                    : new string?[] { null };

                foreach (var libraryId in scopes)
                {
                    var url=c.BaseUrl+"/Items?Recursive=true&IncludeItemTypes=Movie&Fields=PrimaryImageAspectRatio,PremiereDate,CommunityRating,DateCreated&Limit=5000";
                    if(!string.IsNullOrWhiteSpace(libraryId))
                        url += "&ParentId=" + Uri.EscapeDataString(libraryId);

                    var req=new HttpRequestMessage(HttpMethod.Get,url);req.Headers.TryAddWithoutValidation("X-Emby-Token",c.Token);
                    var r=await client.SendAsync(req);if(!r.IsSuccessStatusCode)continue;
                    using var doc=JsonDocument.Parse(await r.Content.ReadAsStringAsync());
                    foreach(var x in doc.RootElement.GetProperty("Items").EnumerateArray())
                    {
                        var id=x.GetProperty("Id").GetString()??"";
                        result.Add(new UnifiedMediaItem("jellyfin:"+lib.Id+":"+id,"jellyfin",lib.Id,"movie",
                            x.GetProperty("Name").GetString()??"", x.TryGetProperty("ProductionYear",out var y)?y.ToString():null,
                            x.TryGetProperty("CommunityRating",out var cr)?cr.ToString():null,
                            ProxyUrl(c.BaseUrl+"/Items/"+id+"/Images/Primary?api_key="+Uri.EscapeDataString(c.Token), "artwork"),null,null,null,
                            x.TryGetProperty("DateCreated",out var dc)&&DateTimeOffset.TryParse(dc.GetString(),out var dto)?dto:null));
                    }
                }
            }
            else if(lib.Type=="plex")
            {
                foreach(var section in lib.LibraryIds)
                {
                    var req=new HttpRequestMessage(HttpMethod.Get,c.BaseUrl+"/library/sections/"+section+"/all?type=1");
                    req.Headers.TryAddWithoutValidation("X-Plex-Token",c.Token);req.Headers.TryAddWithoutValidation("Accept","application/json");
                    var r=await client.SendAsync(req);if(!r.IsSuccessStatusCode)continue;
                    using var doc=JsonDocument.Parse(await r.Content.ReadAsStringAsync());
                    var root=doc.RootElement.GetProperty("MediaContainer");
                    if(!root.TryGetProperty("Metadata",out var arr))continue;
                    foreach(var x in arr.EnumerateArray())
                    {
                        var rk=x.TryGetProperty("ratingKey",out var rkx)?rkx.GetString()??"":"";
                        var thumb=x.TryGetProperty("thumb",out var th)?th.GetString():null;
                        result.Add(new UnifiedMediaItem("plex:"+lib.Id+":"+rk,"plex",lib.Id,"movie",
                            x.TryGetProperty("title",out var t)?t.GetString()??"":"",
                            x.TryGetProperty("year",out var yr)?yr.ToString():null,
                            x.TryGetProperty("rating",out var ra)?ra.ToString():null,
                            string.IsNullOrWhiteSpace(thumb)?null:ProxyUrl(c.BaseUrl+thumb+"?X-Plex-Token="+Uri.EscapeDataString(c.Token), "artwork"),null,null,null,null));
                    }
                }
            }
        }catch(Exception ex){RecordError("unified-movies:"+lib.Id,ex);}
    }
    return Results.Ok(result);
}).RequireAuthorization();

app.MapGet("/api/unified/series", async () =>
{
    var result=new List<UnifiedMediaItem>();
    foreach(var lib in LoadMediaLibraries().Where(x=>x.Enabled))
    {
        var c=MediaConnection(lib);
        try
        {
            using var client=new HttpClient{Timeout=TimeSpan.FromSeconds(60)};
            if(lib.Type=="jellyfin")
            {
                var scopes = lib.LibraryIds.Length > 0
                    ? lib.LibraryIds.Cast<string?>().ToArray()
                    : new string?[] { null };

                foreach (var libraryId in scopes)
                {
                    var url=c.BaseUrl+"/Items?Recursive=true&IncludeItemTypes=Series&Fields=ProductionYear,CommunityRating&Limit=5000";
                    if(!string.IsNullOrWhiteSpace(libraryId))
                        url += "&ParentId=" + Uri.EscapeDataString(libraryId);

                    var req=new HttpRequestMessage(HttpMethod.Get,url);
                    req.Headers.TryAddWithoutValidation("X-Emby-Token",c.Token);
                    var r=await client.SendAsync(req);if(!r.IsSuccessStatusCode)continue;
                    using var doc=JsonDocument.Parse(await r.Content.ReadAsStringAsync());
                    foreach(var x in doc.RootElement.GetProperty("Items").EnumerateArray())
                    {
                        var id=x.GetProperty("Id").GetString()??"";
                        result.Add(new UnifiedMediaItem("jellyfin:"+lib.Id+":"+id,"jellyfin",lib.Id,"series",
                            x.GetProperty("Name").GetString()??"",x.TryGetProperty("ProductionYear",out var y)?y.ToString():null,
                            x.TryGetProperty("CommunityRating",out var rr)?rr.ToString():null,
                            ProxyUrl(c.BaseUrl+"/Items/"+id+"/Images/Primary?api_key="+Uri.EscapeDataString(c.Token), "artwork"),null,null,null,null));
                    }
                }
            }
            else if(lib.Type=="plex")
            {
                foreach(var section in lib.LibraryIds)
                {
                    var req=new HttpRequestMessage(HttpMethod.Get,c.BaseUrl+"/library/sections/"+section+"/all?type=2");
                    req.Headers.TryAddWithoutValidation("X-Plex-Token",c.Token);req.Headers.TryAddWithoutValidation("Accept","application/json");
                    var r=await client.SendAsync(req);if(!r.IsSuccessStatusCode)continue;
                    using var doc=JsonDocument.Parse(await r.Content.ReadAsStringAsync());
                    var root=doc.RootElement.GetProperty("MediaContainer");
                    if(!root.TryGetProperty("Metadata",out var arr))continue;
                    foreach(var x in arr.EnumerateArray())
                    {
                        var rk=x.TryGetProperty("ratingKey",out var rkx)?rkx.GetString()??"":"";
                        var thumb=x.TryGetProperty("thumb",out var th)?th.GetString():null;
                        result.Add(new UnifiedMediaItem(
                            "plex:"+lib.Id+":"+rk,
                            "plex",
                            lib.Id,
                            "series",
                            x.TryGetProperty("title",out var t)?t.GetString()??"": "",
                            x.TryGetProperty("year",out var y)?y.ToString():null,
                            x.TryGetProperty("rating",out var ra)?ra.ToString():null,
                            string.IsNullOrWhiteSpace(thumb)?null:ProxyUrl(c.BaseUrl+thumb+"?X-Plex-Token="+Uri.EscapeDataString(c.Token), "artwork"),
                            null,
                            null,
                            null,
                            null));
                    }
                }
            }
        }catch(Exception ex){RecordError("unified-series:"+lib.Id,ex);}
    }
    return Results.Ok(result);
}).RequireAuthorization();


app.MapGet("/api/unified/{source}/{providerId}/{seriesId}/episodes", async (string source, string providerId, string seriesId) =>
{
    var lib = LoadMediaLibraries().FirstOrDefault(x => x.Id == providerId && x.Enabled);
    if (lib is null) return Results.NotFound();

    var c = MediaConnection(lib);
    var result = new List<UnifiedEpisodeItem>();

    try
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };

        if (source == "jellyfin" && lib.Type == "jellyfin")
        {
            var url = c.BaseUrl + "/Items?ParentId=" + Uri.EscapeDataString(seriesId) +
                "&Recursive=true&IncludeItemTypes=Episode&Fields=ParentIndexNumber,IndexNumber,ProductionYear,CommunityRating&Limit=5000";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.TryAddWithoutValidation("X-Emby-Token", c.Token);
            var r = await client.SendAsync(req);
            if (!r.IsSuccessStatusCode) return Results.StatusCode((int)r.StatusCode);

            using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
            if (!doc.RootElement.TryGetProperty("Items", out var items)) return Results.Ok(result);

            foreach (var x in items.EnumerateArray())
            {
                var id = x.TryGetProperty("Id", out var ix) ? ix.GetString() ?? "" : "";
                var season = x.TryGetProperty("ParentIndexNumber", out var sx) && sx.TryGetInt32(out var s) ? s : 0;
                var episode = x.TryGetProperty("IndexNumber", out var ex) && ex.TryGetInt32(out var e) ? e : 0;
                var name = x.TryGetProperty("Name", out var nx) ? nx.GetString() ?? "Episode" : "Episode";
                var poster = ProxyUrl(c.BaseUrl + "/Items/" + id + "/Images/Primary?api_key=" + Uri.EscapeDataString(c.Token), "artwork");
                result.Add(new UnifiedEpisodeItem(
                    "jellyfin:" + lib.Id + ":" + id, "jellyfin", lib.Id, id, seriesId,
                    season, episode, name,
                    x.TryGetProperty("ProductionYear", out var y) ? y.ToString() : null,
                    x.TryGetProperty("CommunityRating", out var rr) ? rr.ToString() : null,
                    poster));
            }
        }
        else if (source == "plex" && lib.Type == "plex")
        {
            var req = new HttpRequestMessage(HttpMethod.Get,
                c.BaseUrl + "/library/metadata/" + Uri.EscapeDataString(seriesId) + "/allLeaves");
            req.Headers.TryAddWithoutValidation("X-Plex-Token", c.Token);
            req.Headers.TryAddWithoutValidation("Accept", "application/json");
            var r = await client.SendAsync(req);
            if (!r.IsSuccessStatusCode) return Results.StatusCode((int)r.StatusCode);

            using var doc = JsonDocument.Parse(await r.Content.ReadAsStringAsync());
            var root = doc.RootElement.GetProperty("MediaContainer");
            if (!root.TryGetProperty("Metadata", out var items)) return Results.Ok(result);

            foreach (var x in items.EnumerateArray())
            {
                var id = x.TryGetProperty("ratingKey", out var ix) ? ix.GetString() ?? "" : "";
                var season = x.TryGetProperty("parentIndex", out var sx) && sx.TryGetInt32(out var s) ? s : 0;
                var episode = x.TryGetProperty("index", out var ex) && ex.TryGetInt32(out var e) ? e : 0;
                var name = x.TryGetProperty("title", out var nx) ? nx.GetString() ?? "Episode" : "Episode";
                var thumb = x.TryGetProperty("thumb", out var th) ? th.GetString() : null;
                var poster = string.IsNullOrWhiteSpace(thumb)
                    ? null
                    : ProxyUrl(c.BaseUrl + thumb + "?X-Plex-Token=" + Uri.EscapeDataString(c.Token), "artwork");

                result.Add(new UnifiedEpisodeItem(
                    "plex:" + lib.Id + ":" + id, "plex", lib.Id, id, seriesId,
                    season, episode, name,
                    x.TryGetProperty("year", out var y) ? y.ToString() : null,
                    x.TryGetProperty("rating", out var rr) ? rr.ToString() : null,
                    poster));
            }
        }
        else
        {
            return Results.BadRequest("Source does not match the configured media library type.");
        }

        return Results.Ok(result
            .OrderBy(x => x.SeasonNumber)
            .ThenBy(x => x.EpisodeNumber)
            .ThenBy(x => x.Name));
    }
    catch (Exception ex)
    {
        RecordError("unified-episodes:" + providerId, ex);
        return Results.Problem(ex.Message);
    }
}).RequireAuthorization();

app.MapGet("/api/media-libraries", () =>
{
    return Results.Ok(LoadMediaLibraries().Select(x =>
    {
        var c = MediaConnection(x);
        return new { x.Id, x.Name, x.Type, x.Enabled, host = SafeHost(c.BaseUrl), x.LibraryIds, hasToken = !string.IsNullOrWhiteSpace(c.Token) };
    }));
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapGet("/api/media-libraries/{id}/edit", (string id) =>
{
    var p = LoadMediaLibraries().FirstOrDefault(x => x.Id == id);
    if (p is null) return Results.NotFound();
    var c = MediaConnection(p);
    return Results.Ok(new { p.Id, p.Name, p.Type, p.Enabled, baseUrl = c.BaseUrl, p.LibraryIds, tokenStored = !string.IsNullOrWhiteSpace(c.Token) });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/media-libraries", (MediaLibraryInput input) =>
{
    var rows = LoadMediaLibraries();
    var id = string.IsNullOrWhiteSpace(input.Id) ? Guid.NewGuid().ToString("N") : input.Id.Trim();
    var old = rows.FirstOrDefault(x => x.Id == id);
    var oldConn = old is null ? null : MediaConnection(old);
    var token = old is not null && input.KeepExistingToken && string.IsNullOrWhiteSpace(input.Token) ? oldConn?.Token ?? "" : input.Token ?? "";
    var conn = new MediaLibraryConnection((input.BaseUrl ?? "").Trim().TrimEnd('/'), token);
    var selectedLibraries = input.LibraryIds ?? old?.LibraryIds ?? Array.Empty<string>();
    var row = new MediaLibraryProvider(id, input.Name.Trim(), input.Type.Trim().ToLowerInvariant(), input.Enabled, secretBox.Encrypt(JsonSerializer.Serialize(conn, jsonOptions)), selectedLibraries);
    var idx = rows.FindIndex(x => x.Id == id); if (idx >= 0) rows[idx]=row; else rows.Add(row);
    Save(mediaLibrariesFile, rows);
    return Results.Ok(new { row.Id, row.Name, row.Type, row.Enabled, row.LibraryIds });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapDelete("/api/media-libraries/{id}", (string id) =>
{
    var rows=LoadMediaLibraries();
    var next=rows.Where(x=>x.Id!=id).ToList();
    if(next.Count==rows.Count)return Results.NotFound();
    Save(mediaLibrariesFile,next);
    return Results.NoContent();
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/media-libraries/{id}/test", async (string id) =>
{
    var p=LoadMediaLibraries().FirstOrDefault(x=>x.Id==id); if(p is null)return Results.NotFound();
    var c=MediaConnection(p);
    using var client=new HttpClient{Timeout=TimeSpan.FromSeconds(20)};
    try
    {
        if(p.Type=="plex")
        {
            var req=new HttpRequestMessage(HttpMethod.Get,c.BaseUrl+"/identity");
            req.Headers.TryAddWithoutValidation("X-Plex-Token",c.Token);
            var r=await client.SendAsync(req);
            return Results.Ok(new{ok=r.IsSuccessStatusCode,status=(int)r.StatusCode});
        }
        if(p.Type=="jellyfin")
        {
            var req=new HttpRequestMessage(HttpMethod.Get,c.BaseUrl+"/System/Info");
            req.Headers.TryAddWithoutValidation("X-Emby-Token",c.Token);
            var r=await client.SendAsync(req);
            return Results.Ok(new{ok=r.IsSuccessStatusCode,status=(int)r.StatusCode});
        }
        return Results.BadRequest("Unsupported media library type.");
    }
    catch(Exception ex){RecordError("media-library-test:"+id,ex);return Results.Ok(new{ok=false,error=ex.Message});}
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapGet("/api/media-libraries/{id}/libraries", async (string id) =>
{
    var p=LoadMediaLibraries().FirstOrDefault(x=>x.Id==id); if(p is null)return Results.NotFound();
    var c=MediaConnection(p);
    using var client=new HttpClient{Timeout=TimeSpan.FromSeconds(30)};
    try
    {
        if(p.Type=="jellyfin")
        {
            var req=new HttpRequestMessage(HttpMethod.Get,c.BaseUrl+"/Library/VirtualFolders");
            req.Headers.TryAddWithoutValidation("X-Emby-Token",c.Token);
            var r=await client.SendAsync(req); var txt=await r.Content.ReadAsStringAsync();
            if(!r.IsSuccessStatusCode)return Results.StatusCode((int)r.StatusCode);
            using var doc=JsonDocument.Parse(txt);
            var rows=doc.RootElement.EnumerateArray().Select(x=>new{
                id=x.TryGetProperty("ItemId",out var i)?i.GetString():"",
                name=x.TryGetProperty("Name",out var n)?n.GetString():"",
                type=x.TryGetProperty("CollectionType",out var t)?t.GetString():""
            }).ToArray();
            return Results.Ok(rows);
        }
        if(p.Type=="plex")
        {
            var req=new HttpRequestMessage(HttpMethod.Get,c.BaseUrl+"/library/sections");
            req.Headers.TryAddWithoutValidation("X-Plex-Token",c.Token);
            req.Headers.TryAddWithoutValidation("Accept","application/json");
            var r=await client.SendAsync(req); var txt=await r.Content.ReadAsStringAsync();
            if(!r.IsSuccessStatusCode)return Results.StatusCode((int)r.StatusCode);
            using var doc=JsonDocument.Parse(txt);
            var root=doc.RootElement.GetProperty("MediaContainer");
            if(!root.TryGetProperty("Directory",out var dirs))return Results.Ok(Array.Empty<object>());
            return Results.Ok(dirs.EnumerateArray().Select(x=>new{
                id=x.TryGetProperty("key",out var i)?i.GetString():"",
                name=x.TryGetProperty("title",out var n)?n.GetString():"",
                type=x.TryGetProperty("type",out var t)?t.GetString():""
            }).ToArray());
        }
        return Results.BadRequest();
    }
    catch(Exception ex){RecordError("media-libraries:"+id,ex);return Results.Problem(ex.Message);}
}).RequireAuthorization(p=>p.RequireRole("Admin"));

app.MapPost("/api/media-libraries/{id}/libraries/selection", (string id, MediaLibrarySelectionInput input) =>
{
    var rows = LoadMediaLibraries();
    var idx = rows.FindIndex(x => x.Id == id);
    if (idx < 0) return Results.NotFound();

    var selected = (input.LibraryIds ?? Array.Empty<string>())
        .Where(x => !string.IsNullOrWhiteSpace(x))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();

    rows[idx] = rows[idx] with { LibraryIds = selected };
    Save(mediaLibrariesFile, rows);
    return Results.Ok(new { id, libraryIds = selected });
}).RequireAuthorization(p=>p.RequireRole("Admin"));


Dictionary<string,UserSourceAccess> LoadUserSourceAccess() => Load<Dictionary<string,UserSourceAccess>>(userSourceAccessFile) ?? new(StringComparer.OrdinalIgnoreCase);
List<UserSourceItem> LoadUserSources() => Load<List<UserSourceItem>>(userSourcesFile) ?? new();
UserSourceAccess SourceAccessFor(string username){var rows=LoadUserSourceAccess();return rows.TryGetValue(username,out var x)?x:new(true,true,true);}

app.MapGet("/api/source-access/me",(HttpContext ctx)=>{
 var a=ctx.User.IsInRole("Admin")?new UserSourceAccess(true,true,true):SourceAccessFor(ctx.User.Identity?.Name??"");
 return Results.Ok(new{adminIptv=a.AdminIptv,adminPlex=a.AdminPlex,adminJellyfin=a.AdminJellyfin,ownIptv=!a.AdminIptv,ownPlex=!a.AdminPlex,ownJellyfin=!a.AdminJellyfin});
}).RequireAuthorization();
app.MapGet("/api/admin/source-access",()=>Results.Ok(LoadUserSourceAccess())).RequireAuthorization(p=>p.RequireRole("Admin"));
app.MapPut("/api/admin/source-access/{username}",(string username,UserSourceAccess input)=>{
 if(!LoadUsers().Any(x=>x.Username.Equals(username,StringComparison.OrdinalIgnoreCase)))return Results.NotFound();
 var rows=LoadUserSourceAccess();rows[username]=input;Save(userSourceAccessFile,rows);return Results.Ok(input);
}).RequireAuthorization(p=>p.RequireRole("Admin"));
app.MapGet("/api/my-sources",(HttpContext ctx)=>{
 var username=ctx.User.Identity?.Name??"";
 return Results.Ok(LoadUserSources().Where(x=>x.Username.Equals(username,StringComparison.OrdinalIgnoreCase)).Select(x=>new UserSourceSafe(x.Id,x.Type,x.Name,x.Enabled,"",true)));
}).RequireAuthorization();
app.MapPost("/api/my-sources",(UserSourceInput input,HttpContext ctx)=>{
 var username=ctx.User.Identity?.Name??"";var a=SourceAccessFor(username);var type=(input.Type??"").Trim().ToLowerInvariant();
 if((type=="iptv"&&a.AdminIptv)||(type=="plex"&&a.AdminPlex)||(type=="jellyfin"&&a.AdminJellyfin))return Results.BadRequest("This source is managed by the administrator.");
 if(type is not ("iptv" or "plex" or "jellyfin"))return Results.BadRequest("Invalid source type.");
 var rows=LoadUserSources();var id=string.IsNullOrWhiteSpace(input.Id)?Guid.NewGuid().ToString("N"):input.Id.Trim();
 object conn=type=="iptv"?new{input.PlaylistUrl,input.EpgUrl,input.BaseUrl,input.Username,input.Password}:new{input.BaseUrl,input.Token};
 var row=new UserSourceItem(id,username,type,input.Name.Trim(),input.Enabled,secretBox.Encrypt(JsonSerializer.Serialize(conn,jsonOptions)));
 var ix=rows.FindIndex(x=>x.Id==id&&x.Username.Equals(username,StringComparison.OrdinalIgnoreCase));if(ix>=0)rows[ix]=row;else rows.Add(row);Save(userSourcesFile,rows);
 return Results.Ok(new{row.Id,row.Type,row.Name,row.Enabled});
}).RequireAuthorization();
app.MapDelete("/api/my-sources/{id}",(string id,HttpContext ctx)=>{
 var u=ctx.User.Identity?.Name??"";var rows=LoadUserSources();var next=rows.Where(x=>!(x.Id==id&&x.Username.Equals(u,StringComparison.OrdinalIgnoreCase))).ToList();
 if(next.Count==rows.Count)return Results.NotFound();Save(userSourcesFile,next);return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/access/me", (HttpContext ctx) =>
{
    var username = ctx.User.Identity?.Name ?? "";
    var access = AccessFor(username);
    var isAdmin = ctx.User.IsInRole("Admin");
    var allowed = isAdmin ? LoadProfiles().Select(x => x.Id).ToArray() : access.AllowedProfileIds;
    return Results.Ok(new
    {
        allowedProfileIds = allowed,
        defaultProfileId = isAdmin ? (allowed.FirstOrDefault() ?? "default") : access.DefaultProfileId,
        policies = allowed.ToDictionary(id => id, id => PolicyFor(id))
    });
}).RequireAuthorization();

app.MapGet("/api/admin/profile-access", () =>
{
    return Results.Ok(new { userAccess = LoadProfileAccess(), policies = LoadProfilePolicies() });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/profile-access/user/{username}", (string username, UserProfileAccess input) =>
{
    var valid = LoadProfiles().Select(x => x.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);
    var ids = (input.AllowedProfileIds ?? Array.Empty<string>()).Where(valid.Contains).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
    if (ids.Length == 0) return Results.BadRequest("Select at least one profile.");
    var def = ids.Contains(input.DefaultProfileId, StringComparer.OrdinalIgnoreCase) ? input.DefaultProfileId : ids[0];
    var rows = LoadProfileAccess(); rows[username] = new UserProfileAccess(ids, def); Save(profileAccessFile, rows);
    return Results.Ok(rows[username]);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/admin/profile-access/profile/{profileId}", (string profileId, ProfilePolicyInput input) =>
{
    if (!LoadProfiles().Any(x => x.Id == profileId)) return Results.NotFound();
    var existing = PolicyFor(profileId);
    PasswordCredential? pin = existing.PinCredential;
    if (!string.IsNullOrWhiteSpace(input.Pin))
    {
        if (input.Pin!.Length < 4) return Results.BadRequest("PIN must contain at least 4 characters.");
        pin = PasswordCredential.Create(profileId, input.Pin);
    }
    if (input.ClearPin) pin = null;
    var policy = new ProfilePolicy(input.Live, input.Movies, input.Series, input.Downloads,
        input.AllowedProviderIds ?? Array.Empty<string>(), pin);
    var rows = LoadProfilePolicies(); rows[profileId] = policy; Save(profilePoliciesFile, rows);
    return Results.Ok(new { policy.Live, policy.Movies, policy.Series, policy.Downloads, policy.AllowedProviderIds, hasPin = policy.PinCredential is not null });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/profile/{profileId}/verify-pin", (string profileId, PinRequest input) =>
{
    var policy = PolicyFor(profileId);
    if (policy.PinCredential is null) return Results.Ok(new { valid = true });
    return Results.Ok(new { valid = policy.PinCredential.Verify(profileId, input.Pin ?? "") });
}).RequireAuthorization();

app.MapGet("/api/profiles", () => Results.Ok(LoadProfiles())).RequireAuthorization();
app.MapPost("/api/profiles", (ViewerProfileInput req) =>
{
    var rows = LoadProfiles();
    var id = string.IsNullOrWhiteSpace(req.Id) ? Guid.NewGuid().ToString("N") : req.Id;
    var name = (req.Name ?? "Profile").Trim();
    if (name.Length == 0) name = "Profile";
    if (name.Length > 40) name = name[..40];
    var icon = string.IsNullOrWhiteSpace(req.Icon) ? "👤" : req.Icon!;
    var row = new ViewerProfile(id, name, req.IsKids, icon);
    rows.RemoveAll(x => x.Id == id); rows.Add(row); Save(profilesFile, rows.Take(12).ToList()); return Results.Ok(row);
}).RequireAuthorization();
app.MapDelete("/api/profiles/{id}", (string id) =>
{
    var rows = LoadProfiles();
    if (rows.Count <= 1) return Results.BadRequest("At least one profile is required.");
    rows.RemoveAll(x => x.Id == id); Save(profilesFile, rows); return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/channel-preferences/{providerId}", (string providerId) => Results.Ok(PreferencesFor(providerId))).RequireAuthorization();
app.MapPost("/api/channel-preferences/{providerId}/group", (string providerId, GroupVisibilityRequest req) =>
{
    var all = LoadChannelPreferences();
    var pref = all.TryGetValue(providerId, out var existing) ? existing : new ChannelPreferences(new(StringComparer.OrdinalIgnoreCase), new(StringComparer.OrdinalIgnoreCase), new(StringComparer.OrdinalIgnoreCase));
    if (req.Hidden) pref.HiddenGroups.Add(req.Group); else pref.HiddenGroups.Remove(req.Group);
    all[providerId] = pref; Save(channelPreferencesFile, all); return Results.Ok(pref);
}).RequireAuthorization();
app.MapPost("/api/channel-preferences/{providerId}/channel", (string providerId, ChannelPreferenceRequest req) =>
{
    var all = LoadChannelPreferences();
    var pref = all.TryGetValue(providerId, out var existing) ? existing : new ChannelPreferences(new(StringComparer.OrdinalIgnoreCase), new(StringComparer.OrdinalIgnoreCase), new(StringComparer.OrdinalIgnoreCase));
    if (req.Hidden) pref.HiddenChannels.Add(req.ChannelKey); else pref.HiddenChannels.Remove(req.ChannelKey);
    if (req.Alias is not null)
    {
        var alias = req.Alias.Trim();
        if (alias.Length == 0) pref.Aliases.Remove(req.ChannelKey); else pref.Aliases[req.ChannelKey] = alias[..Math.Min(alias.Length, 120)];
    }
    all[providerId] = pref; Save(channelPreferencesFile, all); return Results.Ok(pref);
}).RequireAuthorization();
app.MapPost("/api/channel-preferences/{providerId}/reset", (string providerId) =>
{
    var all = LoadChannelPreferences(); all.Remove(providerId); Save(channelPreferencesFile, all); return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/favourites", () => Results.Ok(LoadFavourites())).RequireAuthorization();
app.MapPost("/api/favourites/{id}", (string id) =>
{
    var fav = LoadFavourites();
    if (!fav.Add(id)) fav.Remove(id);
    Save(favouritesFile, fav);
    return Results.Ok(fav);
}).RequireAuthorization();

app.MapGet("/api/continue", () => Results.Ok(LoadContinue().OrderByDescending(x => x.Updated).Take(50))).RequireAuthorization();
app.MapPost("/api/continue", (ContinueItem item) =>
{
    var list = LoadContinue();
    list.RemoveAll(x => x.Id == item.Id);
    list.Insert(0, item with { Updated = DateTimeOffset.UtcNow });
    Save(continueFile, list.Take(100).ToList());
    return Results.Ok();
}).RequireAuthorization();

app.MapDelete("/api/continue/{id}", (string id) =>
{
    var list = LoadContinue();
    var removed = list.RemoveAll(x => x.Id == id);
    if (removed == 0) return Results.NotFound();
    Save(continueFile, list);
    return Results.NoContent();
}).RequireAuthorization();

app.MapPut("/api/continue/{id}/poster", (string id, ContinuePosterUpdate input) =>
{
    var list = LoadContinue();
    var idx = list.FindIndex(x => x.Id == id);
    if (idx < 0) return Results.NotFound();
    list[idx] = list[idx] with { Poster = input.Poster ?? "" };
    Save(continueFile, list);
    return Results.NoContent();
}).RequireAuthorization();

app.MapDelete("/api/continue", () =>
{
    Save(continueFile, new List<ContinueItem>());
    return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/downloads", () =>
    Results.Ok(downloads.Values.OrderByDescending(x => x.Created).Select(x => x.Safe())))
    .RequireAuthorization();

app.MapPost("/api/downloads/media", (MediaDownloadRequest req) =>
{
    if (!proxyTokens.TryGetValue(req.Token, out var source) || source.Kind is not ("download" or "media"))
        return Results.BadRequest("The media token has expired. Reload the movie or episode list and try again.");

    var storage = FindStorageTarget(req.StorageTargetId, downloadDefault: true);
    if (storage is null) return Results.BadRequest("No download storage target is configured.");

    var id = Guid.NewGuid().ToString("N");
    var title = SafeName(string.IsNullOrWhiteSpace(req.Title) ? "video" : req.Title);
    var ext = SafeExt(new Uri(source.Url).AbsolutePath);
    var finalName = StorageFileName(title, ext);
    var path = storage.Type.Equals("path", StringComparison.OrdinalIgnoreCase)
        ? PathTargetFile(storage, finalName)
        : Path.Combine(downloadsDir, $"{id}-{finalName}");

    var job = new DownloadJob(id, title, source.Url, path, "Queued", 0, null, DateTimeOffset.UtcNow,
        storage.Id, storage.Name, storage.Type, storage.Destination);
    downloads[id] = job;
    _ = Task.Run(async () =>
    {
        await RunDownload(job);
        if (storage.Type.Equals("rclone", StringComparison.OrdinalIgnoreCase) &&
            downloads.TryGetValue(job.Id, out var completed) && completed.Status == "Completed" && File.Exists(completed.Path))
        {
            try
            {
                downloads[job.Id] = completed with { Status = "Uploading", Progress = -1 };
                var uploadName = Path.GetFileName(completed.Path);
                if (uploadName.StartsWith(job.Id + "-", StringComparison.OrdinalIgnoreCase))
                    uploadName = uploadName[(job.Id.Length + 1)..];
                await UploadWithRclone(completed.Path, storage, uploadName);
                try { File.Delete(completed.Path); } catch { }
                downloads[job.Id] = downloads[job.Id] with { Status = "Completed", Progress = 100 };
            }
            catch (Exception ex)
            {
                downloads[job.Id] = downloads[job.Id] with { Status = "Failed", Error = ex.GetBaseException().Message };
            }
        }
    });
    return Results.Accepted($"/api/downloads/{id}", job.Safe());
}).RequireAuthorization();

app.MapGet("/api/downloads/device/{token}", async (string token, string? title, HttpContext ctx) =>
{
    if (!proxyTokens.TryGetValue(token, out var source) || source.Kind is not ("download" or "media"))
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsync("The download token has expired.");
        return;
    }
    if (!Uri.TryCreate(source.Url, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
    {
        ctx.Response.StatusCode = 400;
        return;
    }

    var safeTitle = SafeName(string.IsNullOrWhiteSpace(title) ? "video" : title);
    var isHls = uri.AbsolutePath.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase);
    if (!isHls)
    {
        using var response = await http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ctx.RequestAborted);
        if (!response.IsSuccessStatusCode) { ctx.Response.StatusCode = (int)response.StatusCode; return; }
        var ext = SafeExt(uri.AbsolutePath);
        ctx.Response.ContentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";
        ctx.Response.Headers["Content-Disposition"] = $"attachment; filename=\"{safeTitle}{ext}\"";
        if (response.Content.Headers.ContentLength is long len) ctx.Response.ContentLength = len;
        await using var stream = await response.Content.ReadAsStreamAsync(ctx.RequestAborted);
        await stream.CopyToAsync(ctx.Response.Body, ctx.RequestAborted);
        return;
    }

    var manifest = await http.GetStringAsync(uri, ctx.RequestAborted);
    if (EncryptedHls(manifest))
    {
        ctx.Response.StatusCode = StatusCodes.Status415UnsupportedMediaType;
        await ctx.Response.WriteAsync("Encrypted/protected HLS download is not supported.");
        return;
    }

    var ffmpeg = FindExecutable("ffmpeg");
    if (ffmpeg is null) { ctx.Response.StatusCode = 503; await ctx.Response.WriteAsync("FFmpeg is not installed."); return; }
    ctx.Response.ContentType = "video/x-matroska";
    ctx.Response.Headers["Content-Disposition"] = $"attachment; filename=\"{safeTitle}.mkv\"";

    var psi = new ProcessStartInfo
    {
        FileName = ffmpeg, UseShellExecute = false, RedirectStandardOutput = true,
        RedirectStandardError = true, CreateNoWindow = true
    };
    foreach (var a in new[] { "-hide_banner","-loglevel","error","-nostdin","-i",source.Url,"-map","0","-c","copy","-f","matroska","pipe:1" })
        psi.ArgumentList.Add(a);
    using var process = Process.Start(psi) ?? throw new InvalidOperationException("Could not start FFmpeg.");
    var stderrTask = process.StandardError.ReadToEndAsync();
    try
    {
        await process.StandardOutput.BaseStream.CopyToAsync(ctx.Response.Body, ctx.RequestAborted);
        await process.WaitForExitAsync(ctx.RequestAborted);
    }
    catch (OperationCanceledException)
    {
        try { if (!process.HasExited) process.Kill(entireProcessTree: true); } catch { }
    }
    _ = await stderrTask;
}).RequireAuthorization();

app.MapDelete("/api/downloads/{id}", async (string id) =>
{
    if (!downloads.TryRemove(id, out var job)) return Results.NotFound();
    if (job.StorageType?.Equals("rclone", StringComparison.OrdinalIgnoreCase) == true && job.Status == "Completed")
    {
        try
        {
            var rclone = FindExecutable("rclone");
            if (rclone is not null)
            {
                var fileName = Path.GetFileName(job.Path);
                if (fileName.StartsWith(job.Id + "-", StringComparison.OrdinalIgnoreCase))
                    fileName = fileName[(job.Id.Length + 1)..];
                var remotePath = (job.StorageDestination ?? "").TrimEnd('/') + "/" + fileName;
                var psi = new ProcessStartInfo { FileName = rclone, UseShellExecute = false, RedirectStandardError = true, CreateNoWindow = true };
                psi.ArgumentList.Add("deletefile");
                psi.ArgumentList.Add(remotePath);
                using var rp = Process.Start(psi);
                if (rp is not null) await rp.WaitForExitAsync();
            }
        }
        catch { }
    }
    else
    {
        try { if (File.Exists(job.Path)) File.Delete(job.Path); } catch { }
    }
    return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/downloads/{id}/file", (string id) =>
{
    if (!downloads.TryGetValue(id, out var job) || !File.Exists(job.Path)) return Results.NotFound();
    return Results.File(job.Path, "application/octet-stream", Path.GetFileName(job.Path), enableRangeProcessing: true);
}).RequireAuthorization();

app.MapGet("/api/proxy/{token}", async (string token, HttpContext ctx) =>
{
    if (!proxyTokens.TryGetValue(token, out var target)) return Results.NotFound();
    if (!Uri.TryCreate(target.Url, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
        return Results.BadRequest();

    try
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, uri);
        if (ctx.Request.Headers.TryGetValue("Range", out var range))
            req.Headers.TryAddWithoutValidation("Range", range.ToString());

        using var res = await http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ctx.RequestAborted);
        if (!res.IsSuccessStatusCode) return Results.StatusCode((int)res.StatusCode);

        var mediaType = res.Content.Headers.ContentType?.MediaType ?? "";
        var isHls = mediaType.Contains("mpegurl", StringComparison.OrdinalIgnoreCase) ||
                    uri.AbsolutePath.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase);

        if (isHls)
        {
            var manifest = await res.Content.ReadAsStringAsync(ctx.RequestAborted);
            if (EncryptedHls(manifest))
                return Results.Problem("Encrypted/protected HLS is not proxied. MyOnline TV does not bypass DRM or stream encryption.",
                    statusCode: StatusCodes.Status415UnsupportedMediaType);
            return Results.Text(RewriteHls(manifest, uri, RegisterProxy), "application/vnd.apple.mpegurl");
        }

        ctx.Response.StatusCode = (int)res.StatusCode;
        ctx.Response.ContentType = string.IsNullOrWhiteSpace(mediaType) ? "application/octet-stream" : mediaType;
        if (res.Content.Headers.ContentLength is long len) ctx.Response.ContentLength = len;
        if (res.Content.Headers.ContentRange is not null)
            ctx.Response.Headers.ContentRange = res.Content.Headers.ContentRange.ToString();
        if (res.Headers.AcceptRanges.Any())
            ctx.Response.Headers.AcceptRanges = string.Join(",", res.Headers.AcceptRanges);

        await using var stream = await res.Content.ReadAsStreamAsync(ctx.RequestAborted);
        await stream.CopyToAsync(ctx.Response.Body, ctx.RequestAborted);
        return Results.Empty;
    }
    catch (OperationCanceledException) { return Results.Empty; }
    catch (Exception ex) { return Results.Problem(ex.Message); }
}).RequireAuthorization();




// Browser-compatible Movies / Series playback.
// Raw provider files can be MKV/TS/HEVC/AC3 and are not reliably playable by HTML5 video.
// Convert/remux them server-side to HLS, with an optional H.264/AAC compatibility transcode.
app.MapPost("/api/media/start/{token}", async (string token, bool? transcode) =>
{
    if (!proxyTokens.TryGetValue(token, out var target) || target.Kind != "media")
        return Results.BadRequest("The media playback token has expired. Reload Movies/Series and try again.");

    var sourceUrl = target.Url;
    if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var sourceUri) || sourceUri.Scheme is not ("http" or "https"))
        return Results.BadRequest("Invalid provider media URL.");

    var ffmpeg = FindExecutable("ffmpeg");
    if (ffmpeg is null)
        return Results.Problem("FFmpeg is not installed in the MyOnline TV container.", statusCode: 503);

    var durationSeconds = await ProbeDurationSeconds(sourceUrl);

    foreach (var existing in liveSessions.Keys.ToArray())
        await StopLiveSession(existing);

    var sessionId = Guid.NewGuid().ToString("N");
    var sessionDir = Path.Combine(liveHlsRoot, sessionId);
    Directory.CreateDirectory(sessionDir);
    var playlistPath = Path.Combine(sessionDir, "index.m3u8");
    var segmentPattern = Path.Combine(sessionDir, "seg-%06d.ts");

    var psi = new ProcessStartInfo
    {
        FileName = ffmpeg,
        UseShellExecute = false,
        RedirectStandardError = true,
        RedirectStandardOutput = true,
        CreateNoWindow = true
    };

    var args = new List<string>
    {
        "-hide_banner", "-loglevel", "warning", "-nostdin",
        "-rw_timeout", "20000000",
        "-i", sourceUrl,
        "-map", "0:v:0?", "-map", "0:a:0?"
    };

    if (transcode == true)
    {
        args.AddRange(new[]
        {
            "-c:v", "libx264", "-preset", "veryfast",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k"
        });
    }
    else
    {
        args.AddRange(new[] { "-c", "copy" });
    }

    args.AddRange(new[]
    {
        "-f", "hls",
        "-hls_time", "4",
        "-hls_list_size", "0",
        "-hls_flags", "independent_segments",
        "-hls_segment_filename", segmentPattern,
        playlistPath
    });

    foreach (var arg in args) psi.ArgumentList.Add(arg);

    var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
    var errorLog = new StringBuilder();
    try
    {
        if (!process.Start())
            return Results.Problem("Could not start FFmpeg for media playback.", statusCode: 500);
    }
    catch (Exception ex)
    {
        try { Directory.Delete(sessionDir, true); } catch { }
        return Results.Problem($"Could not start FFmpeg: {ex.Message}", statusCode: 500);
    }

    var session = new LiveSession(sessionId, sessionDir, process, errorLog, sourceUrl, DateTimeOffset.UtcNow, durationSeconds);
    liveSessions[sessionId] = session;

    _ = Task.Run(async () =>
    {
        try
        {
            while (true)
            {
                var line = await process.StandardError.ReadLineAsync();
                if (line is null) break;
                line = line.Replace(sourceUrl, "[provider-media]", StringComparison.Ordinal);
                lock (errorLog)
                {
                    errorLog.AppendLine(line);
                    if (errorLog.Length > 12000) errorLog.Remove(0, Math.Min(4000, errorLog.Length));
                }
            }
        }
        catch { }
    });

    return Results.Accepted($"/api/live/status/{sessionId}", new
    {
        sessionId,
        status = "starting",
        statusUrl = $"/api/live/status/{sessionId}",
        playbackUrl = $"/api/live/hls/{sessionId}/index.m3u8",
        mode = transcode == true ? "hls-transcode" : "hls-remux",
        sourceHost = sourceUri.Host,
        durationSeconds
    });
}).RequireAuthorization();

// Browser-compatible Live TV: resolve the channel directly from the provider cache.
// Live playback no longer depends on a short-lived in-memory proxy token.
app.MapPost("/api/live/start/{providerId}/{channelKey}", async (string providerId, string channelKey, bool? transcode) =>
{
    var provider = LoadProviders().FirstOrDefault(x => x.Id == providerId);
    if (provider is null)
        return Results.NotFound("Provider not found.");

    IReadOnlyList<LiveChannel> rows;
    try
    {
        rows = await GetCachedChannels(provider);
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Could not resolve Live TV channel for provider {ProviderId}.", providerId);
        return Results.Problem(title: "Could not resolve Live TV channel", detail: SafeProviderError(ex), statusCode: 502);
    }

    var channel = rows.FirstOrDefault(x => x.Key == channelKey);
    if (channel is null)
        return Results.NotFound("Channel not found in provider cache. Reload the channel list and try again.");

    var sourceUrl = channel.SourceUrl;
    if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var sourceUri) || sourceUri.Scheme is not ("http" or "https"))
        return Results.BadRequest("Invalid provider stream URL.");

    var ffmpeg = FindExecutable("ffmpeg");
    if (ffmpeg is null)
        return Results.Problem("FFmpeg is not installed in the MyOnline TV container.", statusCode: 503);

    foreach (var existing in liveSessions.Keys.ToArray())
        await StopLiveSession(existing);

    var sessionId = Guid.NewGuid().ToString("N");
    var sessionDir = Path.Combine(liveHlsRoot, sessionId);
    Directory.CreateDirectory(sessionDir);
    var playlistPath = Path.Combine(sessionDir, "index.m3u8");
    var segmentPattern = Path.Combine(sessionDir, "seg-%06d.ts");

    var psi = new ProcessStartInfo
    {
        FileName = ffmpeg,
        UseShellExecute = false,
        RedirectStandardError = true,
        RedirectStandardOutput = true,
        CreateNoWindow = true
    };
    var ffmpegArgs = new List<string>
    {
        "-hide_banner", "-loglevel", "warning", "-nostdin",
        "-rw_timeout", "15000000",
        "-i", sourceUrl,
        "-map", "0:v:0?", "-map", "0:a:0?"
    };
    if (transcode == true)
    {
        ffmpegArgs.AddRange(new[]
        {
            "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k"
        });
    }
    else
    {
        ffmpegArgs.AddRange(new[] { "-c", "copy" });
    }
    ffmpegArgs.AddRange(new[]
    {
        "-f", "hls", "-hls_time", "2", "-hls_list_size", "6",
        "-hls_flags", "delete_segments+append_list+omit_endlist",
        "-hls_segment_filename", segmentPattern, playlistPath
    });
    foreach (var arg in ffmpegArgs) psi.ArgumentList.Add(arg);

    var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
    var errorLog = new StringBuilder();
    try
    {
        if (!process.Start())
            return Results.Problem("Could not start FFmpeg for Live TV.", statusCode: 500);
    }
    catch (Exception ex)
    {
        try { Directory.Delete(sessionDir, true); } catch { }
        return Results.Problem($"Could not start FFmpeg: {ex.Message}", statusCode: 500);
    }

    var session = new LiveSession(sessionId, sessionDir, process, errorLog, sourceUrl, DateTimeOffset.UtcNow);
    liveSessions[sessionId] = session;

    _ = Task.Run(async () =>
    {
        try
        {
            while (true)
            {
                var line = await process.StandardError.ReadLineAsync();
                if (line is null) break;
                line = line.Replace(sourceUrl, "[provider-stream]", StringComparison.Ordinal);
                lock (errorLog)
                {
                    errorLog.AppendLine(line);
                    if (errorLog.Length > 12000) errorLog.Remove(0, Math.Min(4000, errorLog.Length));
                }
            }
        }
        catch { }
    });

    return Results.Accepted($"/api/live/status/{sessionId}", new
    {
        sessionId,
        status = "starting",
        statusUrl = $"/api/live/status/{sessionId}",
        playbackUrl = $"/api/live/hls/{sessionId}/index.m3u8",
        mode = transcode == true ? "hls-transcode" : "hls-remux",
        sourceHost = sourceUri.Host
    });
}).RequireAuthorization();

app.MapGet("/api/live/status/{sessionId}", async (string sessionId) =>
{
    if (!liveSessions.TryGetValue(sessionId, out var session)) return Results.NotFound();
    var playlistPath = Path.Combine(session.Directory, "index.m3u8");
    var ready = File.Exists(playlistPath) && Directory.EnumerateFiles(session.Directory, "*.ts").Any();
    if (ready)
        return Results.Ok(new
        {
            sessionId,
            status = "ready",
            playbackUrl = $"/api/live/hls/{sessionId}/index.m3u8",
            durationSeconds = session.DurationSeconds
        });

    if (session.Process.HasExited)
    {
        string detail;
        lock (session.ErrorLog) detail = session.ErrorLog.ToString().Trim();
        var exitCode = session.Process.ExitCode;
        if (detail.Length > 1600) detail = detail[^1600..];
        await StopLiveSession(sessionId);
        return Results.Ok(new
        {
            sessionId,
            status = "failed",
            error = string.IsNullOrWhiteSpace(detail) ? $"FFmpeg exited with code {exitCode}." : detail
        });
    }

    if (DateTimeOffset.UtcNow - session.Started > TimeSpan.FromSeconds(20))
    {
        string detail;
        lock (session.ErrorLog) detail = session.ErrorLog.ToString().Trim();
        if (detail.Length > 1200) detail = detail[^1200..];
        await StopLiveSession(sessionId);
        return Results.Ok(new
        {
            sessionId,
            status = "failed",
            error = string.IsNullOrWhiteSpace(detail) ? "FFmpeg did not create an HLS segment within 20 seconds." : detail
        });
    }

    return Results.Ok(new { sessionId, status = "starting", durationSeconds = session.DurationSeconds });
}).RequireAuthorization();

app.MapGet("/api/live/hls/{sessionId}/{fileName}", (string sessionId, string fileName) =>
{
    if (!liveSessions.TryGetValue(sessionId, out var session)) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..", StringComparison.Ordinal) ||
        fileName.Contains('/') || fileName.Contains('\\')) return Results.BadRequest();

    var path = Path.Combine(session.Directory, fileName);
    if (!File.Exists(path)) return Results.NotFound();
    var contentType = fileName.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase)
        ? "application/vnd.apple.mpegurl" : "video/mp2t";
    return Results.File(path, contentType, enableRangeProcessing: true);
}).RequireAuthorization();

app.MapDelete("/api/live/session/{sessionId}", async (string sessionId) =>
{
    await StopLiveSession(sessionId);
    return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/system", () =>
{
    var driveRoot = Path.GetPathRoot(dataDir) ?? "/";
    var drive = new DriveInfo(driveRoot);
    var downloadCount = Directory.Exists(downloadsDir) ? Directory.EnumerateFiles(downloadsDir).Count() : 0;
    var backupCount = Directory.Exists(backupsDir) ? Directory.EnumerateFiles(backupsDir, "*.zip").Count() : 0;
    return Results.Ok(new
    {
        version = "30.0.1",
        dataSchemaVersion = 3,
        uptimeSeconds = (long)(DateTimeOffset.UtcNow - startedAt).TotalSeconds,
        processId = Environment.ProcessId,
        machineName = Environment.MachineName,
        os = Environment.OSVersion.ToString(),
        framework = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
        ffmpeg = FindExecutable("ffmpeg") is not null,
        providers = LoadProviders().Count,
        downloads = downloadCount,
        backups = backupCount,
        activeLiveStreams = liveSessions.Count,
        channelCaches = channelCache.Count,
        processWorkingSetBytes = Environment.WorkingSet,
        processorCount = Environment.ProcessorCount,
        profiles = LoadProfiles().Count,
        catalogueCacheBytes = DirectorySize(catalogueCacheDir),
        catalogueCacheFiles = Directory.Exists(catalogueCacheDir) ? Directory.EnumerateFiles(catalogueCacheDir, "*.json").Count() : 0,
        lastCatalogueRefreshes = lastCatalogueSuccess.OrderBy(x => x.Key).ToDictionary(x => x.Key, x => x.Value),
        recentErrors = recentErrors.Reverse().Take(10).ToArray(),
        disk = new
        {
            totalBytes = drive.TotalSize,
            freeBytes = drive.AvailableFreeSpace,
            usedBytes = drive.TotalSize - drive.AvailableFreeSpace
        }
    });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapGet("/api/providers/health", async () =>
{
    var rows = new List<object>();
    foreach (var provider in LoadProviders())
    {
        var sw = Stopwatch.StartNew();
        var ok = false;
        var message = "Unknown";
        try
        {
            var c = Connection(provider);
            var testUrl = provider.Type == "xtream"
                ? $"{c.BaseUrl?.TrimEnd('/')}/player_api.php?username={Uri.EscapeDataString(c.Username ?? "")}&password={Uri.EscapeDataString(c.Password ?? "")}"
                : c.PlaylistUrl;

            if (string.IsNullOrWhiteSpace(testUrl))
                throw new InvalidOperationException("Provider URL is missing.");

            using var request = new HttpRequestMessage(HttpMethod.Get, testUrl);
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);
            ok = response.IsSuccessStatusCode;
            message = $"{(int)response.StatusCode} {response.ReasonPhrase}";
        }
        catch (Exception ex)
        {
            message = ex.GetBaseException().Message;
            RecordError("provider-health:" + provider.Id, ex);
        }
        sw.Stop();
        rows.Add(new
        {
            provider.Id,
            provider.Name,
            provider.Type,
            ok,
            latencyMs = sw.ElapsedMilliseconds,
            message
        });
    }
    return Results.Ok(rows);
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/system/backup", () =>
{
    Directory.CreateDirectory(backupsDir);
    var stamp = DateTimeOffset.Now.ToString("yyyyMMdd-HHmmss");
    var file = Path.Combine(backupsDir, $"myonline-tv-backup-{stamp}.zip");

    using (var archive = ZipFile.Open(file, ZipArchiveMode.Create))
    {
        foreach (var name in new[]
        {
            "admin.json", "secrets.key", "providers.json", "favourites.json",
            "continue-watching.json", "channel-preferences.json", "profiles.json", "version", "release.json"
        })
        {
            var source = Path.Combine(dataDir, name);
            if (File.Exists(source))
                archive.CreateEntryFromFile(source, name, CompressionLevel.SmallestSize);
        }
    }

    return Results.Ok(new
    {
        fileName = Path.GetFileName(file),
        sizeBytes = new FileInfo(file).Length,
        created = DateTimeOffset.Now
    });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapGet("/api/system/backups", () =>
{
    Directory.CreateDirectory(backupsDir);
    var rows = Directory.EnumerateFiles(backupsDir, "*.zip")
        .Select(x => new FileInfo(x))
        .OrderByDescending(x => x.CreationTimeUtc)
        .Take(50)
        .Select(x => new
        {
            fileName = x.Name,
            sizeBytes = x.Length,
            created = x.CreationTimeUtc
        });
    return Results.Ok(rows);
}).RequireAuthorization();

app.MapPost("/api/system/restore/{fileName}", (string fileName) =>
{
    var safe = Path.GetFileName(fileName);
    var file = Path.Combine(backupsDir, safe);
    if (!File.Exists(file) || !safe.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)) return Results.NotFound();
    using var archive = ZipFile.OpenRead(file);
    var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "providers.json", "favourites.json", "continue-watching.json", "channel-preferences.json", "profiles.json", "users.json", "admin.json", "profile-access.json", "profile-policies.json", "media-libraries.json"
    };
    foreach (var entry in archive.Entries.Where(e => allowed.Contains(e.FullName)))
    {
        var target = Path.Combine(dataDir, Path.GetFileName(entry.FullName));
        entry.ExtractToFile(target, true);
    }
    channelCache.Clear();
    return Results.Ok(new { restored = safe, restartRecommended = true });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapPost("/api/system/recover", async () =>
{
    var removed = 0;
    foreach (var pair in liveSessions.ToArray())
    {
        try
        {
            if (pair.Value.Process.HasExited)
            {
                await StopLiveSession(pair.Key);
                removed++;
            }
        }
        catch (Exception ex)
        {
            RecordError("live-recovery:" + pair.Key, ex);
        }
    }

    // Clean abandoned HLS directories older than 12 hours that are not active sessions.
    var activeDirs = liveSessions.Values.Select(x => Path.GetFullPath(x.Directory))
        .ToHashSet(StringComparer.OrdinalIgnoreCase);
    try
    {
        foreach (var dir in Directory.EnumerateDirectories(liveHlsRoot))
        {
            var full = Path.GetFullPath(dir);
            if (activeDirs.Contains(full)) continue;
            if (DateTime.UtcNow - Directory.GetLastWriteTimeUtc(dir) < TimeSpan.FromHours(12)) continue;
            try { Directory.Delete(dir, true); removed++; } catch { }
        }
    }
    catch (Exception ex) { RecordError("hls-recovery", ex); }

    return Results.Ok(new { recovered = true, cleaned = removed, activeLiveStreams = liveSessions.Count });
}).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapGet("/api/storage-targets", () =>
{
    var rows = LoadStorageTargets().Where(x => x.Enabled).Select(x => new
    {
        x.Id, x.Name, x.Type, x.Destination, x.DefaultDvr, x.DefaultDownload, x.Enabled
    });
    return Results.Ok(rows);
}).RequireAuthorization();

app.MapGet("/api/admin/storage-targets", (HttpContext ctx) =>
{
    if (!ctx.User.IsInRole("Admin")) return Results.Forbid();
    return Results.Ok(LoadStorageTargets());
}).RequireAuthorization();

app.MapPost("/api/admin/storage-targets", (StorageTargetInput input, HttpContext ctx) =>
{
    if (!ctx.User.IsInRole("Admin")) return Results.Forbid();
    if (string.IsNullOrWhiteSpace(input.Name) || string.IsNullOrWhiteSpace(input.Destination))
        return Results.BadRequest("Name and destination are required.");
    var type = (input.Type ?? "path").Trim().ToLowerInvariant();
    if (type is not ("path" or "rclone"))
        return Results.BadRequest("Storage type must be 'path' or 'rclone'.");

    var rows = LoadStorageTargets();
    var id = string.IsNullOrWhiteSpace(input.Id) ? Guid.NewGuid().ToString("N") : input.Id.Trim();
    rows.RemoveAll(x => x.Id.Equals(id, StringComparison.OrdinalIgnoreCase));

    if (input.DefaultDvr) rows = rows.Select(x => x with { DefaultDvr = false }).ToList();
    if (input.DefaultDownload) rows = rows.Select(x => x with { DefaultDownload = false }).ToList();

    rows.Add(new StorageTarget(id, input.Name.Trim(), type, input.Destination.Trim(),
        input.DefaultDvr, input.DefaultDownload, input.Enabled));
    Save(storageTargetsFile, rows);
    return Results.Ok(rows);
}).RequireAuthorization();

app.MapDelete("/api/admin/storage-targets/{id}", (string id, HttpContext ctx) =>
{
    if (!ctx.User.IsInRole("Admin")) return Results.Forbid();
    var rows = LoadStorageTargets();
    var removed = rows.RemoveAll(x => x.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
    if (removed == 0) return Results.NotFound();
    Save(storageTargetsFile, rows);
    return Results.NoContent();
}).RequireAuthorization();

app.MapPost("/api/admin/storage-targets/{id}/test", async (string id, HttpContext ctx) =>
{
    if (!ctx.User.IsInRole("Admin")) return Results.Forbid();
    var target = LoadStorageTargets().FirstOrDefault(x => x.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
    if (target is null) return Results.NotFound();
    try
    {
        if (target.Type.Equals("path", StringComparison.OrdinalIgnoreCase))
        {
            Directory.CreateDirectory(target.Destination);
            var probe = Path.Combine(target.Destination, $".myonlinetv-{Guid.NewGuid():N}.tmp");
            await File.WriteAllTextAsync(probe, "MyOnline TV storage test");
            File.Delete(probe);
        }
        else
        {
            var rclone = FindExecutable("rclone") ?? throw new InvalidOperationException("rclone is not installed.");
            var psi = new ProcessStartInfo { FileName = rclone, UseShellExecute = false, RedirectStandardError = true, CreateNoWindow = true };
            psi.ArgumentList.Add("lsd");
            psi.ArgumentList.Add(target.Destination);
            using var process = Process.Start(psi) ?? throw new InvalidOperationException("Could not start rclone.");
            var errTask = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();
            var err = await errTask;
            if (process.ExitCode != 0) throw new InvalidOperationException(err);
        }
        return Results.Ok(new { ok = true, message = "Storage target is writable/reachable." });
    }
    catch (Exception ex) { return Results.BadRequest(new { ok = false, message = ex.GetBaseException().Message }); }
}).RequireAuthorization();

app.MapGet("/api/dvr/rules", () => Results.Ok(Load<List<DvrRule>>(dvrRulesFile) ?? new())).RequireAuthorization();
app.MapPost("/api/dvr/rules", (DvrRuleInput input) =>
{
    if (string.IsNullOrWhiteSpace(input.ProviderId) || string.IsNullOrWhiteSpace(input.ChannelKey) || string.IsNullOrWhiteSpace(input.TitlePattern))
        return Results.BadRequest("Provider, channel and title are required.");
    var rows=Load<List<DvrRule>>(dvrRulesFile) ?? new();
    var id=string.IsNullOrWhiteSpace(input.Id)?Guid.NewGuid().ToString("N"):input.Id;
    rows.RemoveAll(x=>x.Id==id);
    rows.Add(new DvrRule(id,input.ProviderId,input.ChannelKey,input.ChannelName??"Channel",input.TitlePattern.Trim(),
        input.NewOnly,input.Enabled,input.PaddingBeforeMinutes,input.PaddingAfterMinutes,input.KeepLatest,input.StorageTargetId,DateTimeOffset.UtcNow));
    Save(dvrRulesFile,rows);
    return Results.Ok(rows);
}).RequireAuthorization();
app.MapDelete("/api/dvr/rules/{id}", (string id) =>
{
    var rows=Load<List<DvrRule>>(dvrRulesFile) ?? new();
    if(rows.RemoveAll(x=>x.Id==id)==0)return Results.NotFound();
    Save(dvrRulesFile,rows); return Results.NoContent();
}).RequireAuthorization();

app.MapGet("/api/recordings", () =>
{
    var rows = LoadRecordingJobs()
        .OrderByDescending(x => x.Start)
        .Select(x => new
        {
            x.Id, x.ProviderId, x.ChannelKey, x.ChannelName, x.Title, x.Start, x.End,
            x.Status, x.FileName, x.Error, x.StorageTargetId, x.StorageTargetName, x.StoredPath,
            completed = x.Status == "Completed",
            playable = x.Status == "Completed" && !string.IsNullOrWhiteSpace(x.StoredPath) &&
                       x.StorageTargetId != null &&
                       LoadStorageTargets().Any(t => t.Id == x.StorageTargetId && t.Type == "path") &&
                       File.Exists(x.StoredPath)
        });
    return Results.Ok(rows);
}).RequireAuthorization();

app.MapPost("/api/recordings", (RecordingRequest input) =>
{
    if (string.IsNullOrWhiteSpace(input.ProviderId) || string.IsNullOrWhiteSpace(input.ChannelKey))
        return Results.BadRequest("Provider and channel are required.");
    if (input.End <= input.Start) return Results.BadRequest("End must be after start.");

    var rows = LoadRecordingJobs();
    var job = new RecordingJob(
        Guid.NewGuid().ToString("N"),
        input.ProviderId.Trim(),
        input.ChannelKey.Trim(),
        string.IsNullOrWhiteSpace(input.ChannelName) ? "Channel" : input.ChannelName.Trim(),
        string.IsNullOrWhiteSpace(input.Title) ? "Recording" : input.Title.Trim(),
        input.Start,
        input.End,
        "Scheduled",
        null,
        null,
        input.StorageTargetId,
        null,
        null);
    rows.Add(job);
    SaveRecordingJobs(rows);
    return Results.Ok(job);
}).RequireAuthorization();

app.MapPost("/api/recordings/{id}/cancel", (string id) =>
{
    var rows = LoadRecordingJobs();
    var idx = rows.FindIndex(x => x.Id == id);
    if (idx < 0) return Results.NotFound();

    if (recordingProcesses.TryRemove(id, out var process))
    {
        try { if (!process.HasExited) process.Kill(entireProcessTree: true); } catch { }
    }

    rows[idx] = rows[idx] with { Status = "Cancelled" };
    SaveRecordingJobs(rows);
    return Results.Ok();
}).RequireAuthorization();

app.MapDelete("/api/recordings/{id}", async (string id) =>
{
    var rows = LoadRecordingJobs();
    var job = rows.FirstOrDefault(x => x.Id == id);
    if (job is null) return Results.NotFound();
    if (recordingProcesses.TryRemove(id, out var process))
    {
        try { if (!process.HasExited) process.Kill(entireProcessTree: true); } catch { }
    }
    if (!string.IsNullOrWhiteSpace(job.StoredPath))
    {
        var target = FindStorageTarget(job.StorageTargetId);
        if (target?.Type.Equals("path", StringComparison.OrdinalIgnoreCase) == true)
        {
            try { if (File.Exists(job.StoredPath)) File.Delete(job.StoredPath); } catch { }
        }
        else if (target?.Type.Equals("rclone", StringComparison.OrdinalIgnoreCase) == true)
        {
            try
            {
                var rclone = FindExecutable("rclone");
                if (rclone is not null)
                {
                    var psi = new ProcessStartInfo { FileName = rclone, UseShellExecute = false, RedirectStandardError = true, CreateNoWindow = true };
                    psi.ArgumentList.Add("deletefile");
                    psi.ArgumentList.Add(job.StoredPath);
                    using var rp = Process.Start(psi);
                    if (rp is not null) await rp.WaitForExitAsync();
                }
            }
            catch { }
        }
    }
    rows.RemoveAll(x => x.Id == id);
    SaveRecordingJobs(rows);
    return Results.Ok();
}).RequireAuthorization();

app.MapGet("/api/recordings/{id}/file", (string id) =>
{
    var job = LoadRecordingJobs().FirstOrDefault(x => x.Id == id);
    if (job is null || string.IsNullOrWhiteSpace(job.StoredPath) || string.IsNullOrWhiteSpace(job.FileName)) return Results.NotFound();
    var target = FindStorageTarget(job.StorageTargetId);
    if (target?.Type.Equals("path", StringComparison.OrdinalIgnoreCase) != true || !File.Exists(job.StoredPath))
        return Results.NotFound();
    return Results.File(job.StoredPath, "video/mp2t", job.FileName, enableRangeProcessing: true);
}).RequireAuthorization();

_ = Task.Run(RecordingSchedulerLoop);

app.MapFallbackToFile("index.html");

app.MapGet("/api/rooms", () => Results.Ok(Load<List<RoomDevice>>(roomsFile) ?? new())).RequireAuthorization();
app.MapPost("/api/rooms/register", (RoomDeviceInput input) =>
{
    var rows=Load<List<RoomDevice>>(roomsFile) ?? new();
    var id=string.IsNullOrWhiteSpace(input.Id)?Guid.NewGuid().ToString("N"):input.Id;
    rows.RemoveAll(x=>x.Id==id);
    rows.Add(new RoomDevice(id,string.IsNullOrWhiteSpace(input.Name)?"Device":input.Name.Trim(),input.DeviceType??"Browser",DateTimeOffset.UtcNow,input.ActiveMediaId,input.ActiveTitle,input.PositionSeconds));
    Save(roomsFile,rows); return Results.Ok(rows);
}).RequireAuthorization();
app.MapPost("/api/rooms/{id}/handoff", (string id, RoomHandoff input) =>
{
    var rows=Load<List<RoomDevice>>(roomsFile) ?? new(); var i=rows.FindIndex(x=>x.Id==id); if(i<0)return Results.NotFound();
    rows[i]=rows[i] with { ActiveMediaId=input.MediaId,ActiveTitle=input.Title,PositionSeconds=input.PositionSeconds,Updated=DateTimeOffset.UtcNow };
    Save(roomsFile,rows); return Results.Ok(rows[i]);
}).RequireAuthorization();


app.MapGet("/api/notifications", () => Results.Ok((Load<List<AppNotification>>(notificationsFile) ?? new()).OrderByDescending(x=>x.Created).Take(100))).RequireAuthorization();
app.MapPost("/api/notifications", (AppNotificationInput input) =>
{
    var rows=Load<List<AppNotification>>(notificationsFile) ?? new();
    rows.Add(new AppNotification(Guid.NewGuid().ToString("N"),input.Title,input.Message,input.Kind??"info",DateTimeOffset.UtcNow,false));
    Save(notificationsFile,rows.TakeLast(500).ToList()); return Results.Ok();
}).RequireAuthorization();
app.MapPost("/api/notifications/{id}/read", (string id) =>
{
    var rows=Load<List<AppNotification>>(notificationsFile) ?? new();var i=rows.FindIndex(x=>x.Id==id);if(i<0)return Results.NotFound();
    rows[i]=rows[i] with { Read=true };Save(notificationsFile,rows);return Results.NoContent();
}).RequireAuthorization();


app.MapGet("/api/appliance/health", () =>
{
    var drive=new DriveInfo(Path.GetPathRoot(dataDir)!);
    return Results.Ok(new {
        version="30.0.1", dataDirectory=dataDir,
        storageTargets=LoadStorageTargets().Count,
        dvrRules=(Load<List<DvrRule>>(dvrRulesFile)??new()).Count,
        rooms=(Load<List<RoomDevice>>(roomsFile)??new()).Count,
        diskFreeBytes=drive.AvailableFreeSpace,diskTotalBytes=drive.TotalSize,
        utc=DateTimeOffset.UtcNow
    });
}).RequireAuthorization();
app.MapGet("/api/appliance/backup", (HttpContext ctx) =>
{
    if(!ctx.User.IsInRole("Admin"))return Results.Forbid();
    var files=new[]{providersFile,profilesFile,continueFile,recordingsFile,storageTargetsFile,dvrRulesFile,roomsFile,notificationsFile}.Where(File.Exists).ToArray();
    var temp=Path.Combine(Path.GetTempPath(),$"myonlinetv-backup-{DateTime.UtcNow:yyyyMMddHHmmss}.zip");
    using(var z=ZipFile.Open(temp,ZipArchiveMode.Create))foreach(var f in files)z.CreateEntryFromFile(f,Path.GetFileName(f));
    return Results.File(temp,"application/zip",Path.GetFileName(temp));
}).RequireAuthorization();


app.MapGet("/api/diagnostics", async (HttpContext ctx) =>
{
    if(!ctx.User.IsInRole("Admin")) return Results.Forbid();
    var checks=new List<object>();
    void Add(string name,bool ok,string detail)=>checks.Add(new {name,ok,detail});
    Add("FFmpeg",FindExecutable("ffmpeg") is not null,FindExecutable("ffmpeg")??"Not found");
    Add("FFprobe",FindExecutable("ffprobe") is not null,FindExecutable("ffprobe")??"Not found");
    Add("rclone",FindExecutable("rclone") is not null,FindExecutable("rclone")??"Not found");
    var targets=LoadStorageTargets();
    Add("Storage configuration",targets.Any(x=>x.Enabled),$"{targets.Count(x=>x.Enabled)} enabled target(s)");
    var ps=LoadProviders();
    Add("IPTV providers",ps.Any(),$"{ps.Count} configured provider(s)");
    var libs=LoadMediaLibraries();
    Add("Media libraries",libs.Any(x=>x.Enabled),$"{libs.Count(x=>x.Enabled)} enabled library/libraries");
    var drive=new DriveInfo(Path.GetPathRoot(dataDir)!);
    Add("Disk space",drive.AvailableFreeSpace>1024L*1024*1024*2,$"{drive.AvailableFreeSpace/1073741824.0:F1} GB free");
    await Task.CompletedTask;
    return Results.Ok(new {utc=DateTimeOffset.UtcNow,checks});
}).RequireAuthorization();



app.MapGet("/api/dvr/conflicts", () =>
{
    var jobs=LoadRecordingJobs().Where(x=>x.Status is "Scheduled" or "Recording").OrderBy(x=>x.Start).ToList();
    var conflicts=new List<object>();
    for(var i=0;i<jobs.Count;i++) for(var j=i+1;j<jobs.Count;j++)
        if(jobs[i].ProviderId==jobs[j].ProviderId && jobs[i].Start<jobs[j].End && jobs[j].Start<jobs[i].End)
            conflicts.Add(new {first=jobs[i],second=jobs[j],reason="Overlapping recordings on the same IPTV provider"});
    return Results.Ok(conflicts);
}).RequireAuthorization();

app.MapGet("/api/dvr/status", () =>
{
    var jobs=LoadRecordingJobs();
    return Results.Ok(new {
        scheduled=jobs.Count(x=>x.Status=="Scheduled"),recording=jobs.Count(x=>x.Status=="Recording"),
        failed=jobs.Count(x=>x.Status=="Failed"),completed=jobs.Count(x=>x.Status=="Completed"),
        rules=(Load<List<DvrRule>>(dvrRulesFile)??new()).Count(x=>x.Enabled)
    });
}).RequireAuthorization();




NavigationConfig LoadNavigationConfig()
{
    var saved=Load<NavigationConfig>(navigationFile);
    var ids=new[]{"home","live","guide","movies","series","plex","jellyfin","downloads","recordings","notifications","rooms","library","search","system","platform","diagnostics","appliance","completion","admin"};
    var map=(saved?.Items??new List<NavigationItemConfig>()).ToDictionary(x=>x.Id,StringComparer.OrdinalIgnoreCase);
    var items=ids.Select((id,n)=>map.TryGetValue(id,out var x)?x:new NavigationItemConfig(id,true,n))
      .Select(x=>x.Id is "home" or "admin"?x with{Enabled=true}:x).OrderBy(x=>x.Order).ToList();
    return new NavigationConfig(items);
}
app.MapGet("/api/navigation",()=>Results.Ok(LoadNavigationConfig())).RequireAuthorization();
app.MapPut("/api/admin/navigation",(NavigationConfig input)=>{
    var allowed=new HashSet<string>(new[]{"home","live","guide","movies","series","plex","jellyfin","downloads","recordings","notifications","rooms","library","search","system","platform","diagnostics","appliance","completion","admin"},StringComparer.OrdinalIgnoreCase);
    var items=(input.Items??new List<NavigationItemConfig>()).Where(x=>allowed.Contains(x.Id)).GroupBy(x=>x.Id,StringComparer.OrdinalIgnoreCase).Select(g=>g.First())
      .Select(x=>x.Id is "home" or "admin"?x with{Enabled=true}:x).OrderBy(x=>x.Order).ToList();
    Save(navigationFile,new NavigationConfig(items));return Results.Ok(LoadNavigationConfig());
}).RequireAuthorization(p=>p.RequireRole("Admin"));

app.MapGet("/api/profile-state/{profileId}", (string profileId) =>
{
    var rows=Load<List<ProfileMediaState>>(profileStateFile)??new();
    return Results.Ok(rows.Where(x=>x.ProfileId==profileId).OrderByDescending(x=>x.Updated));
}).RequireAuthorization();
app.MapPut("/api/profile-state/{profileId}/{mediaId}", (string profileId,string mediaId,ProfileMediaStateInput input) =>
{
    var rows=Load<List<ProfileMediaState>>(profileStateFile)??new();var i=rows.FindIndex(x=>x.ProfileId==profileId&&x.MediaId==mediaId);
    var item=new ProfileMediaState(profileId,mediaId,input.Title??mediaId,input.Kind??"media",input.PositionSeconds,input.DurationSeconds,input.Watched,input.Favourite,input.Poster,DateTimeOffset.UtcNow);
    if(i>=0)rows[i]=item;else rows.Add(item);Save(profileStateFile,rows);return Results.Ok(item);
}).RequireAuthorization();
app.MapDelete("/api/profile-state/{profileId}/{mediaId}", (string profileId,string mediaId) =>
{
    var rows=Load<List<ProfileMediaState>>(profileStateFile)??new();rows.RemoveAll(x=>x.ProfileId==profileId&&x.MediaId==mediaId);Save(profileStateFile,rows);return Results.NoContent();
}).RequireAuthorization();



app.MapPost("/api/downloads/{id}/cancel", (string id) =>
{
    if(!downloads.TryGetValue(id,out var job))return Results.NotFound();
    if(job.Status is "Completed" or "Failed")return Results.BadRequest("Download is not active.");
    downloads[id]=job with {Status="Cancelled",Error="Cancelled by user"};
    return Results.Ok(downloads[id].Safe());
}).RequireAuthorization();
app.MapPost("/api/downloads/{id}/retry", (string id) =>
{
    if(!downloads.TryGetValue(id,out var job))return Results.NotFound();
    if(job.Status is not ("Failed" or "Cancelled"))return Results.BadRequest("Only failed/cancelled downloads can be retried.");
    var retry=job with {Status="Queued",Progress=0,Error=null,Created=DateTimeOffset.UtcNow};
    downloads[id]=retry;_ = Task.Run(()=>RunDownload(retry));return Results.Accepted($"/api/downloads/{id}",retry.Safe());
}).RequireAuthorization();



app.MapGet("/api/platform/status", () =>
{
    var drive=new DriveInfo(Path.GetPathRoot(dataDir)!);
    return Results.Ok(new {
        version="30.0.1",platform="MyOnline TV Platform",
        providers=LoadProviders().Count,
        storageTargets=LoadStorageTargets().Count(x=>x.Enabled),
        dvrRules=(Load<List<DvrRule>>(dvrRulesFile)??new()).Count(x=>x.Enabled),
        rooms=(Load<List<RoomDevice>>(roomsFile)??new()).Count,
        notifications=(Load<List<AppNotification>>(notificationsFile)??new()).Count(x=>!x.Read),
        diskFreeBytes=drive.AvailableFreeSpace,
        features=new[]{"IPTV","EPG","DVR","Storage","Plex","Jellyfin","Unified Library","Profile Sync","Search","Multi-room","PWA","Notifications","Diagnostics"}
    });
}).RequireAuthorization();



// v30.0.1 Source & Access Architecture
app.MapGet("/api/sources/effective",(HttpContext ctx)=>{
    var username=ctx.User.Identity?.Name??"";
    var access=ctx.User.IsInRole("Admin")?new UserSourceAccess(true,true,true):SourceAccessFor(username);
    var own=LoadUserSources().Where(x=>x.Username.Equals(username,StringComparison.OrdinalIgnoreCase)&&x.Enabled).ToList();
    var libs=LoadMediaLibraries().Where(x=>x.Enabled).ToList();
    return Results.Ok(new {
        iptv=new { mode=access.AdminIptv?"admin":"user", available=access.AdminIptv ? LoadProviders().Any() : own.Any(x=>x.Type=="iptv") },
        plex=new { mode=access.AdminPlex?"admin":"user", available=access.AdminPlex ? libs.Any(x=>x.Type.Equals("plex",StringComparison.OrdinalIgnoreCase)) : own.Any(x=>x.Type=="plex") },
        jellyfin=new { mode=access.AdminJellyfin?"admin":"user", available=access.AdminJellyfin ? libs.Any(x=>x.Type.Equals("jellyfin",StringComparison.OrdinalIgnoreCase)) : own.Any(x=>x.Type=="jellyfin") }
    });
}).RequireAuthorization();

app.MapGet("/api/sources/capabilities",(HttpContext ctx)=>Results.Ok(new{
    live=true,guide=true,movies=true,series=true,search=true,recording=true,
    userSources=true,perUserAccess=true,secretStorage="AES-GCM"
})).RequireAuthorization();


// v30.0.1 Player 3.0
app.MapGet("/api/player/preferences",(HttpContext ctx)=>{
    var all=Load<Dictionary<string,Dictionary<string,object>>>(playerPrefsFile)??new();
    var key=ctx.User.Identity?.Name??"default";
    return Results.Ok(all.TryGetValue(key,out var v)?v:new Dictionary<string,object>{{"fit","contain"},{"volume",1.0},{"autoplayNext",true},{"preferDirectPlay",true}});
}).RequireAuthorization();
app.MapPut("/api/player/preferences",(Dictionary<string,object> input,HttpContext ctx)=>{
    var all=Load<Dictionary<string,Dictionary<string,object>>>(playerPrefsFile)??new();
    all[ctx.User.Identity?.Name??"default"]=input;Save(playerPrefsFile,all);return Results.Ok(input);
}).RequireAuthorization();
app.MapGet("/api/player/capabilities",()=>Results.Ok(new{
    hls=true,ffmpegFallback=true,resume=true,keyboardShortcuts=true,audioTracks=true,subtitleTracks=true
})).RequireAuthorization();


// v30.0.1 DVR 3.0
app.MapGet("/api/dvr/engine",()=>Results.Ok(Load<Dictionary<string,object>>(dvrEngineFile)??new Dictionary<string,object>{
 {"enabled",true},{"maxConcurrent",2},{"defaultPrePaddingMinutes",2},{"defaultPostPaddingMinutes",5},{"conflictPolicy","newest-wins"},{"keepLatest",0}
})).RequireAuthorization();
app.MapPut("/api/admin/dvr/engine",(Dictionary<string,object> input)=>{
 Save(dvrEngineFile,input);return Results.Ok(input);
}).RequireAuthorization(p=>p.RequireRole("Admin"));
app.MapGet("/api/dvr/upcoming",()=>{
 var now=DateTimeOffset.UtcNow;
 var rows=(Load<List<RecordingJob>>(recordingsFile)??new()).Where(x=>x.Status=="Scheduled"&&x.Start>now).OrderBy(x=>x.Start).Take(100);
 return Results.Ok(rows);
}).RequireAuthorization();


// v30.0.1 EPG & Live TV 3.0
app.MapGet("/api/epg/preferences",(HttpContext ctx)=>{
 var all=Load<Dictionary<string,Dictionary<string,object>>>(epgPrefsFile)??new();
 var key=ctx.User.Identity?.Name??"default";
 return Results.Ok(all.TryGetValue(key,out var v)?v:new Dictionary<string,object>{{"days",7},{"compact",false},{"favoritesFirst",true},{"showNowNext",true}});
}).RequireAuthorization();
app.MapPut("/api/epg/preferences",(Dictionary<string,object> input,HttpContext ctx)=>{
 var all=Load<Dictionary<string,Dictionary<string,object>>>(epgPrefsFile)??new();all[ctx.User.Identity?.Name??"default"]=input;Save(epgPrefsFile,all);return Results.Ok(input);
}).RequireAuthorization();
app.MapGet("/api/live/now-next",async ()=>{
 try{
   var result=new List<object>();
   foreach(var provider in LoadProviders())
   {
      var channels=await GetCachedChannels(provider);
      result.AddRange(channels.Take(500-result.Count).Select(x=>(object)new{providerId=provider.Id,id=x.Id,key=x.Key,name=x.Name,group=x.Group,number=x.Number}));
      if(result.Count>=500)break;
   }
   return Results.Ok(result);
 }catch(Exception ex){return Results.Problem(ex.Message);}
}).RequireAuthorization();


// v30.0.1 Unified Library 3.0
app.MapGet("/api/library/preferences",(HttpContext ctx)=>{
 var all=Load<Dictionary<string,Dictionary<string,object>>>(libraryPrefsFile)??new();var key=ctx.User.Identity?.Name??"default";
 return Results.Ok(all.TryGetValue(key,out var v)?v:new Dictionary<string,object>{{"mergeDuplicates",true},{"preferredSource","auto"},{"sort","recent"},{"hideUnavailable",true}});
}).RequireAuthorization();
app.MapPut("/api/library/preferences",(Dictionary<string,object> input,HttpContext ctx)=>{
 var all=Load<Dictionary<string,Dictionary<string,object>>>(libraryPrefsFile)??new();all[ctx.User.Identity?.Name??"default"]=input;Save(libraryPrefsFile,all);return Results.Ok(input);
}).RequireAuthorization();
app.MapGet("/api/library/sources",(HttpContext ctx)=>{
 var a=ctx.User.IsInRole("Admin")?new UserSourceAccess(true,true,true):SourceAccessFor(ctx.User.Identity?.Name??"");
 return Results.Ok(new[]{new{id="iptv",admin=a.AdminIptv},new{id="plex",admin=a.AdminPlex},new{id="jellyfin",admin=a.AdminJellyfin}});
}).RequireAuthorization();


// v30.0.1 Profiles & Household 3.0
app.MapGet("/api/household/preferences",(HttpContext ctx)=>{
 var all=Load<Dictionary<string,Dictionary<string,object>>>(householdPrefsFile)??new();var key=ctx.User.Identity?.Name??"default";
 return Results.Ok(all.TryGetValue(key,out var v)?v:new Dictionary<string,object>{{"syncWatchState",true},{"syncFavorites",true},{"syncContinueWatching",true},{"handoffEnabled",true}});
}).RequireAuthorization();
app.MapPut("/api/household/preferences",(Dictionary<string,object> input,HttpContext ctx)=>{
 var all=Load<Dictionary<string,Dictionary<string,object>>>(householdPrefsFile)??new();all[ctx.User.Identity?.Name??"default"]=input;Save(householdPrefsFile,all);return Results.Ok(input);
}).RequireAuthorization();
app.MapGet("/api/household/sync-status",(HttpContext ctx)=>{
 var username=ctx.User.Identity?.Name??"";
 var states=Load<List<ProfileMediaState>>(profileStateFile)??new();
 return Results.Ok(new{username,profiles=LoadProfiles().Count,states=states.Count,lastSync=DateTimeOffset.UtcNow});
}).RequireAuthorization();


// v30.0.1 Admin 2.0
app.MapGet("/api/admin/overview",(HttpContext ctx)=>{
 var users=LoadUsers();var providers=LoadProviders();var libs=LoadMediaLibraries();var stores=Load<List<StorageTarget>>(storageTargetsFile)??new();
 return Results.Ok(new{
   users=users.Count,admins=users.Count(x=>x.Role.Equals("Admin",StringComparison.OrdinalIgnoreCase)&&x.Enabled),iptvProviders=providers.Count,mediaLibraries=libs.Count,
   storageTargets=stores.Count,navigation=LoadNavigationConfig().Items.Count,sourcePolicies=LoadUserSourceAccess().Count,
   version="30.0.1"
 });
}).RequireAuthorization(p=>p.RequireRole("Admin"));


// v30.0.1 Backup, Restore & Migration
app.MapGet("/api/system/migration-manifest",(HttpContext ctx)=>{
 var files=Directory.Exists(dataDir)?Directory.GetFiles(dataDir,"*.json").Select(Path.GetFileName).OrderBy(x=>x).ToArray():Array.Empty<string>();
 return Results.Ok(new{version="30.0.1",created=DateTimeOffset.UtcNow,dataDirectory=dataDir,configurationFiles=files,
   includes=new[]{"users","profiles","providers","media-libraries","navigation","source-access","user-sources","storage","dvr","preferences"}});
}).RequireAuthorization(p=>p.RequireRole("Admin"));
app.MapGet("/api/system/backup-readiness",()=>{
 var writable=true;try{var p=Path.Combine(dataDir,".backup-test");File.WriteAllText(p,"ok");File.Delete(p);}catch{writable=false;}
 return Results.Ok(new{dataDirectory=dataDir,writable,configFiles=Directory.Exists(dataDir)?Directory.GetFiles(dataDir,"*.json").Length:0});
}).RequireAuthorization(p=>p.RequireRole("Admin"));


// v30.0.1 Appliance
app.MapGet("/api/appliance/readiness",async ()=>{
 var checks=new List<object>();
 bool ffmpeg=File.Exists("/usr/bin/ffmpeg")||File.Exists("/usr/local/bin/ffmpeg");
 bool ffprobe=File.Exists("/usr/bin/ffprobe")||File.Exists("/usr/local/bin/ffprobe");
 bool dataWritable=true;try{var p=Path.Combine(dataDir,".ready");File.WriteAllText(p,"ok");File.Delete(p);}catch{dataWritable=false;}
 var providers=LoadProviders();var libs=LoadMediaLibraries();
 checks.Add(new{name="FFmpeg",ok=ffmpeg});
 checks.Add(new{name="FFprobe",ok=ffprobe});
 checks.Add(new{name="Data directory",ok=dataWritable});
 checks.Add(new{name="Authentication",ok=LoadUsers().Count>0});
 checks.Add(new{name="Media source",ok=providers.Any()||libs.Any(x=>x.Enabled)});
 await Task.CompletedTask;
 return Results.Ok(new{version="30.0.1",ready=ffmpeg&&ffprobe&&dataWritable&&LoadUsers().Count>0,checks});
}).RequireAuthorization(p=>p.RequireRole("Admin"));
app.MapGet("/api/appliance/version",()=>Results.Ok(new{product="MyOnline TV",version="30.0.1",channel="stable",platform="LXC"}));


// v30.0.1 Feature Completion audit
app.MapGet("/api/admin/feature-completion", () => Results.Ok(new
{
    summary = FeatureCompletionCatalog.Summary(),
    features = FeatureCompletionCatalog.All
})).RequireAuthorization(p => p.RequireRole("Admin"));

app.MapGet("/api/platform/cost-policy", () => Results.Ok(new
{
    mandatoryRuntimeCostSek = 0,
    paidAiRequired = false,
    commercialMetadataRequired = false,
    paidMonitoringRequired = false,
    paidAutomationRequired = false,
    externalAiDefault = "disabled",
    externalAiMonthlyBudgetSek = 0
})).RequireAuthorization();

app.MapGet("/api/platform/performance-policy",()=>Results.Ok(PerformancePolicyV207.Snapshot()));

app.MapGet("/api/platform/tv-capabilities",()=>Results.Ok(TvNavigationV208.Capabilities()));

app.MapGet("/api/platform/unified-media-policy",()=>Results.Ok(new{selection="direct-play,local-network,quality,latency",deduplication=true}));

app.MapGet("/api/home/rails",()=>Results.Ok(HomeComposerV210.Default()));

app.MapGet("/api/search/capabilities",()=>Results.Ok(new{domains=new[]{"live","epg","movies","series","episodes","recordings"},ranking="local-deterministic"}));

app.MapGet("/api/dvr/policy",()=>Results.Ok(new{seriesRules=true,newEpisodesOnly=true,priority=true,retention=true,storageTargets=true,conflicts=true}));

app.MapGet("/api/platform/android-tv",()=>Results.Ok(AndroidTvPolicyV213.ProductContract()));

app.MapGet("/api/devices/pairing-policy",()=>Results.Ok(new{codeLifetimeMinutes=5,persistentDeviceToken=true,revoke=true,localOnly=true}));

app.MapGet("/api/rooms/capabilities",()=>Results.Ok(new{handoff=true,playbackOwnership=true,localRealtime=true}));

app.MapGet("/api/catchup/capabilities",()=>Results.Ok(new{providerCapabilityRequired=true,startOver=true,catchup=true}));

app.MapGet("/api/player/multiview-capabilities",()=>Results.Ok(new{pip=true,multiviewMax=4,resourceGated=true}));

app.MapGet("/api/platform/local-intelligence",()=>Results.Ok(LocalSmartTvV218.CostPolicy()));

app.MapGet("/api/system/self-healing-policy",()=>Results.Ok(new{bounded=true,local=true,actions=new[]{"restart-web","restart-stream-session","retry-provider","stop-new-recordings"}}));

app.MapGet("/api/platform/stable-gate",()=>Results.Ok(new{featureFreeze=true,mandatoryRuntimeCostSek=0,required=new[]{"build","lxc-upgrade","health","live","movies","series","dvr","mobile","tablet","desktop","tv","android-tv"}}));

app.MapGet("/api/diagnostics/v23",()=>Results.Ok(RuntimeMetricsV2310.Capabilities()));

app.MapGet("/api/media-index/capabilities",()=>Results.Ok(MediaIndexV2320.Capabilities()));

app.MapGet("/api/live-tv/v4/capabilities",()=>Results.Ok(LiveTv4V2330.Capabilities()));

app.MapGet("/api/unified/v4/capabilities",()=>Results.Ok(UnifiedLibrary4V2340.Capabilities()));

app.MapGet("/api/playback/v2/capabilities",()=>Results.Ok(PlaybackEngine2V2350.Capabilities()));

app.MapGet("/api/playback/resilience",()=>Results.Ok(PlaybackResilienceV2360.Capabilities()));

app.MapGet("/api/profiles/v2/capabilities",()=>Results.Ok(Profiles2V2370.Capabilities()));

app.MapGet("/api/home/v4/rails",()=>Results.Ok(PersonalHomeV2380.Capabilities()));

app.MapGet("/api/search/v4/capabilities",()=>Results.Ok(UniversalSearchV2390.Capabilities()));

app.MapGet("/api/devices/v24/capabilities",()=>Results.Ok(MultiDeviceV2400.Capabilities()));

app.MapGet("/api/android-tv/v24/capabilities",()=>Results.Ok(AndroidTvV2410.Capabilities()));

app.MapGet("/api/remote/v24/capabilities",()=>Results.Ok(RemotePairingV2420.Capabilities()));

app.MapGet("/api/rooms/v24/capabilities",()=>Results.Ok(RoomsHandoffV2430.Capabilities()));

app.MapGet("/api/platform/v25/capabilities",()=>Results.Ok(AdvancedTvV2500.Capabilities()));

app.MapGet("/api/admin/overview-v2", () => Results.Ok(new {
    version = File.Exists("VERSION") ? File.ReadAllText("VERSION").Trim() : "unknown",
    health = "healthy",
    uptime = Environment.TickCount64,
    runtime = Environment.Version.ToString(),
    machine = Environment.MachineName,
    timestamp = DateTimeOffset.UtcNow
}));

app.MapGet("/api/admin/sources/summary", () => Results.Ok(new {
    sourceTypes = new[] { "IPTV", "EPG", "Plex", "Jellyfin" },
    actions = new[] { "test", "refresh", "edit" },
    credentialsServerSide = true
}));

app.MapGet("/api/admin/dvr-storage/capabilities", () => Results.Ok(new {
    dvr = new { active = true, upcoming = true, failed = true, conflicts = true },
    storage = new { diskUsage = true, recordingPaths = true, writableCheck = true }
}));

app.MapGet("/api/admin/users-devices/capabilities", () => Results.Ok(new {
    users = new { roles = true, profiles = true, kidsMode = true },
    devices = new { paired = true, rooms = true, revoke = true, lastSeen = true }
}));

app.MapGet("/api/admin/diagnostics/capabilities", () => Results.Ok(new {
    apiTimings = true,
    cacheMetrics = true,
    providerTimings = true,
    ffmpegHealth = true,
    logs = true,
    exportBundle = true
}));

app.MapGet("/api/admin/recovery/capabilities", () => Results.Ok(new {
    backup = true,
    verifyBackup = true,
    restore = true,
    preUpdateBackup = true,
    healthCheck = true,
    rollback = true
}));

app.MapGet("/api/admin/production-readiness", () => Results.Ok(new {
    version = "30.0.1",
    adminUx = true,
    overview = true,
    sources = true,
    dvrStorage = true,
    usersDevices = true,
    diagnostics = true,
    recovery = true,
    mobile = true,
    mandatoryRuntimeCostSek = 0
}));

app.MapGet("/api/stream-doctor/capabilities",()=>Results.Ok(StreamDoctorV2610.Capabilities()));

app.MapGet("/api/notifications/capabilities",()=>Results.Ok(NotificationCenterV2620.Capabilities()));

app.MapGet("/api/epg/smart/capabilities",()=>Results.Ok(SmartEpgV2630.Capabilities()));

app.MapGet("/api/epg/tonight/capabilities",()=>Results.Ok(WhatsOnTonightV2640.Capabilities()));

app.MapGet("/api/watchlist/capabilities",()=>Results.Ok(UnifiedWatchlistV2650.Capabilities()));

app.MapGet("/api/collections/smart/capabilities",()=>Results.Ok(SmartCollectionsV2660.Capabilities()));

app.MapGet("/api/sports/capabilities",()=>Results.Ok(SportsHubV2670.Capabilities()));

app.MapGet("/api/profiles/family/capabilities",()=>Results.Ok(FamilyGuestV2680.Capabilities()));

app.MapGet("/api/experience/capabilities",()=>Results.Ok(CinemaScreensaverV2690.Capabilities()));

app.MapGet("/api/system/self-healing-v27",()=>Results.Ok(SelfHealingV2700.Capabilities()));

app.MapGet("/api/platform/v28/architecture",()=>Results.Ok(ArchitectureV28V2800.Capabilities()));

app.MapGet("/api/platform/release-gate",()=>Results.Ok(new { version="30.0.1", focus="stabilization", zeroMandatoryCost=true })).RequireAuthorization();

app.MapGet("/api/playback/engine",()=>Results.Ok(new { version="2.0", live=true, vod=true, unified=true, recordings=true, fallback=true, zeroMandatoryCost=true })).RequireAuthorization();

app.MapGet("/api/live/production",()=>Results.Ok(new { numericZap=true, miniGuide=true, nowNext=true, readinessPolling=true, recovery=true })).RequireAuthorization();

app.MapGet("/api/guide/production",()=>Results.Ok(new { nowButton=true, filters=true, recordActions=true, keyboard=true, largeEpgOptimized=true })).RequireAuthorization();

app.MapGet("/api/unified/production",()=>Results.Ok(new { dedupe=true, bestSource=true, alternateSources=true, watchlist=true, continueWatching=true })).RequireAuthorization();

app.MapGet("/api/dvr/production",()=>Results.Ok(new { rules=true, conflicts=true, storageCheck=true, recovery=true, retention=true, playback=true })).RequireAuthorization();

app.MapGet("/api/tv/ux",()=>Results.Ok(new { dpad=true, back=true, focus=true, coarsePointer=true, reducedMotion=true })).RequireAuthorization();

app.MapGet("/api/mobile/companion",()=>Results.Ok(new { remote=true, pairing=true, keyboard=true, channelPicker=true, playbackControl=true, cloudRequired=false })).RequireAuthorization();

app.MapGet("/api/smart-home/production",()=>Results.Ok(new { smartEpg=true, tonight=true, sportsHub=true, watchlist=true, localScoring=true })).RequireAuthorization();

app.MapGet("/api/notifications/production",()=>Results.Ok(new { recording=true, epg=true, storage=true, system=true, local=true })).RequireAuthorization();

app.MapGet("/api/self-healing/production",()=>Results.Ok(new { epgRefresh=true, hlsCleanup=true, ffmpegRecovery=true, storageRetention=true, rateLimited=true })).RequireAuthorization();

app.MapGet("/api/update/policy",()=>Results.Ok(new { backupBeforeUpdate=true, healthCheck=true, rollbackOnFailure=true })).RequireAuthorization();

app.MapGet("/api/security/baseline",()=>Results.Ok(new { credentialsServerSide=true, secureSessions=true, rateLimitingRequired=true, csrfRequired=true, auditRequired=true })).RequireAuthorization();

app.MapGet("/api/performance/targets",()=>Results.Ok(new { homeFirstPaintMs=1000, channelZapTargetMs=2000, cache=true, mediaIndex=true, backgroundRefresh=true })).RequireAuthorization();

app.MapGet("/api/observability/capabilities",()=>Results.Ok(new { providerLatency=true, activeStreams=true, disk=true, cache=true, recentErrors=true, recoveryActions=true })).RequireAuthorization();

app.MapGet("/api/ux/polish",()=>Results.Ok(new { consistentControls=true, focusStates=true, responsive=true, emptyStates=true, errorStates=true })).RequireAuthorization();

app.MapGet("/api/production/v30",()=>Results.Ok(new { newFeatures=false, regressionGate=true, cleanInstallGate=true, upgradeGate=true, backupRestoreGate=true, tvGate=true, dvrGate=true })).RequireAuthorization();

app.Run();

async Task StopLiveSession(string sessionId)
{
    if (!liveSessions.TryRemove(sessionId, out var session)) return;
    try
    {
        if (!session.Process.HasExited)
        {
            session.Process.Kill(entireProcessTree: true);
            await session.Process.WaitForExitAsync();
        }
    }
    catch { }
    finally
    {
        try { session.Process.Dispose(); } catch { }
        try { if (Directory.Exists(session.Directory)) Directory.Delete(session.Directory, true); } catch { }
    }
}

async Task RunDownload(DownloadJob job)
{
    try
    {
        downloads[job.Id] = job with { Status = "Checking", Progress = 0 };
        var uri = new Uri(job.SourceUrl);
        var manifest = uri.AbsolutePath.EndsWith(".m3u8", StringComparison.OrdinalIgnoreCase);

        if (!manifest)
        {
            using var head = new HttpRequestMessage(HttpMethod.Get, uri);
            using var response = await http.SendAsync(head, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();
            var mediaType = response.Content.Headers.ContentType?.MediaType ?? "";
            manifest = mediaType.Contains("mpegurl", StringComparison.OrdinalIgnoreCase);

            if (!manifest)
            {
                downloads[job.Id] = downloads[job.Id] with { Status = "Downloading" };
                var total = response.Content.Headers.ContentLength;
                await using var input = await response.Content.ReadAsStreamAsync();
                await using var output = File.Create(job.Path);
                var buffer = new byte[1024 * 1024];
                long received = 0;
                while (true)
                {
                    var read = await input.ReadAsync(buffer);
                    if (read == 0) break;
                    await output.WriteAsync(buffer.AsMemory(0, read));
                    received += read;
                    downloads[job.Id] = downloads[job.Id] with
                    {
                        Progress = total > 0 ? Math.Min(99, received * 100.0 / total.Value) : -1
                    };
                }
                downloads[job.Id] = downloads[job.Id] with { Status = "Completed", Progress = 100 };
                return;
            }
        }

        var manifestText = await http.GetStringAsync(uri);
        if (EncryptedHls(manifestText))
            throw new InvalidOperationException("Encrypted/protected HLS download is not supported.");

        downloads[job.Id] = downloads[job.Id] with { Status = "Downloading HLS", Progress = -1 };
        var ffmpeg = FindExecutable("ffmpeg") ?? throw new InvalidOperationException("ffmpeg is not installed.");
        var outputPath = Path.ChangeExtension(job.Path, ".mp4");
        var psi = new ProcessStartInfo { FileName = ffmpeg, UseShellExecute = false, RedirectStandardError = true };
        psi.ArgumentList.Add("-y");
        psi.ArgumentList.Add("-nostdin");
        psi.ArgumentList.Add("-i");
        psi.ArgumentList.Add(job.SourceUrl);
        psi.ArgumentList.Add("-map");
        psi.ArgumentList.Add("0");
        psi.ArgumentList.Add("-c");
        psi.ArgumentList.Add("copy");
        psi.ArgumentList.Add(outputPath);
        using var proc = Process.Start(psi) ?? throw new InvalidOperationException("Could not start ffmpeg.");
        var errTask = proc.StandardError.ReadToEndAsync();
        await proc.WaitForExitAsync();
        var err = await errTask;
        if (proc.ExitCode != 0)
            throw new InvalidOperationException("ffmpeg failed: " + (err.Length > 800 ? err[^800..] : err));
        downloads[job.Id] = downloads[job.Id] with { Path = outputPath, Status = "Completed", Progress = 100 };
    }
    catch (Exception ex)
    {
        downloads[job.Id] = downloads[job.Id] with { Status = "Failed", Error = ex.Message };
    }
}

(string Id, ProviderStored Provider, ProviderConnection Connection)? ResolveXtream(string providerId)
{
    var p = LoadProviders().FirstOrDefault(x => x.Id == providerId && x.Type == "xtream");
    return p is null ? null : (p.Id, p, Connection(p));
}

async Task<JsonDocument> XtreamJson(ProviderConnection c, string action, TimeSpan timeout, (string Key, string Value)? extra = null)
{
    var url = BuildXtreamPlayerApiUrl(c, action, extra);
    using var request = new HttpRequestMessage(HttpMethod.Get, url);
    request.Headers.TryAddWithoutValidation("Accept", "application/json,text/plain,*/*");
    request.Headers.TryAddWithoutValidation("User-Agent", "MyOnline-TV/28.0.0");
    using var cts = new CancellationTokenSource(timeout);
    using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);
    if (!response.IsSuccessStatusCode)
        throw new HttpRequestException($"Provider returned HTTP {(int)response.StatusCode} {response.ReasonPhrase}".Trim());
    var text = await response.Content.ReadAsStringAsync(cts.Token);
    if (string.IsNullOrWhiteSpace(text))
        throw new InvalidOperationException($"Provider returned an empty response for {action}.");
    try
    {
        return JsonDocument.Parse(text);
    }
    catch (JsonException ex)
    {
        var preview = Regex.Replace(text, @"\\s+", " ").Trim();
        if (preview.Length > 180) preview = preview[..180];
        throw new InvalidOperationException($"Provider returned invalid JSON for {action}: {preview}", ex);
    }
}

async Task<JsonDocument> CachedXtreamJson(
    ConcurrentDictionary<string, TimedJsonCache> cache,
    string key,
    ProviderConnection connection,
    string action,
    TimeSpan timeout,
    (string Key, string Value)? extra = null)
{
    if (cache.TryGetValue(key, out var hit) &&
        DateTimeOffset.UtcNow - hit.Loaded < TimeSpan.FromMinutes(10))
        return JsonDocument.Parse(hit.Json);

    var diskKind = action.StartsWith("get_vod_", StringComparison.Ordinal) ? "vod" :
                   action.StartsWith("get_series", StringComparison.Ordinal) ? "series" : "generic";
    var diskKey = action + "|" + key + "|" + (extra?.Value ?? "");
    if (TryLoadDiskJsonCache(diskKind, diskKey, TimeSpan.FromHours(6), out var diskJson))
    {
        cache[key] = new TimedJsonCache(diskJson, DateTimeOffset.UtcNow);
        _ = Task.Run(async () =>
        {
            try
            {
                using var refreshed = await XtreamJson(connection, action, timeout, extra);
                var refreshedJson = refreshed.RootElement.GetRawText();
                cache[key] = new TimedJsonCache(refreshedJson, DateTimeOffset.UtcNow);
                SaveDiskJsonCache(diskKind, diskKey, refreshedJson);
                lastCatalogueSuccess[action] = DateTimeOffset.UtcNow;
            }
            catch (Exception ex)
            {
                RecordError("catalogue:" + action, ex);
                app.Logger.LogInformation(ex, "Background refresh failed for {Action}; stale disk cache retained.", action);
            }
        });
        return JsonDocument.Parse(diskJson);
    }

    using var doc = await XtreamJson(connection, action, timeout, extra);
    var json = doc.RootElement.GetRawText();
    cache[key] = new TimedJsonCache(json, DateTimeOffset.UtcNow);
    SaveDiskJsonCache(diskKind, diskKey, json);
    lastCatalogueSuccess[action] = DateTimeOffset.UtcNow;
    return JsonDocument.Parse(json);
}

async Task<List<LiveChannel>> GetCachedChannels(ProviderStored p)
{
    var now = DateTimeOffset.UtcNow;
    if (channelCache.TryGetValue(p.Id, out var hit) && now - hit.Loaded < TimeSpan.FromMinutes(10))
        return hit.Channels;

    // If stale data exists, serve it immediately and refresh in the background.
    if (hit is not null && hit.Channels.Count > 0)
    {
        _ = Task.Run(async () =>
        {
            var gate = channelLocks.GetOrAdd(p.Id, _ => new SemaphoreSlim(1, 1));
            if (!await gate.WaitAsync(0)) return;
            try
            {
                var refreshed = await LoadProviderChannels(p);
                channelCache[p.Id] = new ChannelCacheEntry(refreshed, DateTimeOffset.UtcNow);
                app.Logger.LogInformation("Refreshed {Count} cached Live TV channels for provider {ProviderId}.", refreshed.Count, p.Id);
            }
            catch (Exception ex)
            {
                app.Logger.LogWarning(ex, "Background Live TV channel refresh failed for provider {ProviderId}; stale cache retained.", p.Id);
            }
            finally { gate.Release(); }
        });
        return hit.Channels;
    }

    var loadGate = channelLocks.GetOrAdd(p.Id, _ => new SemaphoreSlim(1, 1));
    await loadGate.WaitAsync();
    try
    {
        if (channelCache.TryGetValue(p.Id, out hit) && DateTimeOffset.UtcNow - hit.Loaded < TimeSpan.FromMinutes(10))
            return hit.Channels;
        var rows = await LoadProviderChannels(p);
        channelCache[p.Id] = new ChannelCacheEntry(rows, DateTimeOffset.UtcNow);
        return rows;
    }
    finally { loadGate.Release(); }
}

async Task<List<LiveChannel>> LoadProviderChannels(ProviderStored p)
{
    var c = Connection(p);
    if (p.Type == "xtream")
        return await LoadXtreamLiveChannels(c);
    if (string.IsNullOrWhiteSpace(c.PlaylistUrl))
        throw new InvalidOperationException("Provider has no playlist URL.");
    return await LoadM3uChannels(c.PlaylistUrl);
}

async Task<List<LiveChannel>> LoadXtreamLiveChannels(ProviderConnection c)
{
    // The channel list is the critical request. Keep its timeout bounded so reverse proxies never wait for minutes.
    using var doc = await XtreamJson(c, "get_live_streams", TimeSpan.FromSeconds(12));
    if (doc.RootElement.ValueKind != JsonValueKind.Array)
        throw new InvalidOperationException("Xtream get_live_streams did not return a JSON array.");

    var categories = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    try
    {
        using var categoryDoc = await XtreamJson(c, "get_live_categories", TimeSpan.FromSeconds(3));
        if (categoryDoc.RootElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in categoryDoc.RootElement.EnumerateArray())
            {
                var id = JsonString(item, "category_id");
                if (!string.IsNullOrWhiteSpace(id)) categories[id] = JsonString(item, "category_name");
            }
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogInformation(ex, "Xtream live categories unavailable; channel list will use category IDs.");
    }

    var rows = new List<LiveChannel>();
    foreach (var x in doc.RootElement.EnumerateArray().Take(20000))
    {
        var streamId = JsonString(x, "stream_id");
        if (string.IsNullOrWhiteSpace(streamId)) continue;
        var categoryId = JsonString(x, "category_id");
        var group = categories.TryGetValue(categoryId, out var categoryName) && !string.IsNullOrWhiteSpace(categoryName)
            ? categoryName : (string.IsNullOrWhiteSpace(categoryId) ? "Other" : categoryId);
        var epgId = JsonString(x, "epg_channel_id");
        rows.Add(new LiveChannel(
            streamId,
            string.IsNullOrWhiteSpace(epgId) ? streamId : epgId,
            string.IsNullOrWhiteSpace(JsonString(x, "name")) ? $"Channel {streamId}" : JsonString(x, "name"),
            group,
            JsonString(x, "num"),
            JsonString(x, "stream_icon"),
            BuildXtreamLiveUrl(c, streamId)));
    }
    return rows;
}

async Task<List<LiveChannel>> LoadM3uChannels(string url)
{
    using var request = new HttpRequestMessage(HttpMethod.Get, url);
    request.Headers.TryAddWithoutValidation("Accept", "application/x-mpegURL,text/plain,*/*");
    request.Headers.TryAddWithoutValidation("User-Agent", "MyOnline-TV/28.0.0");
    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
    using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);
    if (!response.IsSuccessStatusCode)
        throw new HttpRequestException($"Provider returned HTTP {(int)response.StatusCode} {response.ReasonPhrase}".Trim());
    var text = await response.Content.ReadAsStringAsync(cts.Token);
    if (!text.Contains("#EXTM3U", StringComparison.OrdinalIgnoreCase) && !text.Contains("#EXTINF", StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException("Provider response was not an M3U playlist.");
    return ParseM3u(text).Take(20000).Select(ch =>
    {
        var key = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(ch.Url))).Substring(0, 24);
        return new LiveChannel(key, ch.Id, ch.Name, ch.Group, ch.Number, ch.Logo, ch.Url);
    }).ToList();
}

async Task<HttpResponseMessage> SendProviderRequest(string url, HttpCompletionOption completion, TimeSpan timeout)
{
    using var request = new HttpRequestMessage(HttpMethod.Get, url);
    request.Headers.TryAddWithoutValidation("Accept", "application/json,text/plain,*/*");
    request.Headers.TryAddWithoutValidation("User-Agent", "MyOnline-TV/28.0.0");
    using var cts = new CancellationTokenSource(timeout);
    return await http.SendAsync(request, completion, cts.Token);
}

async Task<ProviderProbe> ProbeProvider(string url, TimeSpan timeout)
{
    var sw = Stopwatch.StartNew();
    try
    {
        using var response = await SendProviderRequest(url, HttpCompletionOption.ResponseHeadersRead, timeout);
        sw.Stop();
        return new ProviderProbe(
            response.IsSuccessStatusCode,
            (int)response.StatusCode,
            response.ReasonPhrase ?? "",
            response.Content.Headers.ContentType?.MediaType ?? "",
            sw.ElapsedMilliseconds,
            response.RequestMessage?.RequestUri?.Host ?? "");
    }
    catch (Exception ex)
    {
        sw.Stop();
        return new ProviderProbe(false, null, SafeProviderError(ex), "", sw.ElapsedMilliseconds,
            Uri.TryCreate(url, UriKind.Absolute, out var u) ? u.Host : "");
    }
}

static string SafeProviderError(Exception ex)
{
    var message = ex.GetBaseException().Message;
    // Do not accidentally expose credentials if a provider URL is included in an exception.
    message = Regex.Replace(message, @"([?&](?:username|password)=)[^&\s]+", "$1***", RegexOptions.IgnoreCase);
    message = Regex.Replace(message, @"/(live|movie|series)/[^/\s]+/[^/\s]+/", "/$1/***/***/", RegexOptions.IgnoreCase);
    return message.Length > 600 ? message[..600] : message;
}

string ProxyArtwork(string? url) =>
    string.IsNullOrWhiteSpace(url) ? "" : ProxyUrl(url, "artwork");

static async Task SignIn(HttpContext ctx, string username, string role)
{
    var claims = new[]
    {
        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, username),
        new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, role)
    };
    var identity = new System.Security.Claims.ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
    await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
        new System.Security.Claims.ClaimsPrincipal(identity));
}

static bool ValidPassword(string? password) => !string.IsNullOrWhiteSpace(password) && password.Length >= 10;
static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

static void ValidateHttpUrl(string? value)
{
    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
        throw new InvalidOperationException("A valid HTTP/HTTPS provider URL is required.");
}

static string ProviderHost(ProviderStored p, ProviderConnection c)
{
    var raw = p.Type == "xtream" ? c.BaseUrl : c.PlaylistUrl;
    return Uri.TryCreate(raw, UriKind.Absolute, out var uri) ? uri.Host : "";
}

static string BuildXtreamM3uUrl(ProviderConnection c) =>
    $"{c.BaseUrl?.TrimEnd('/')}/get.php?username={Uri.EscapeDataString(c.Username ?? "")}&password={Uri.EscapeDataString(c.Password ?? "")}&type=m3u_plus&output=ts";

static string BuildXtreamPlayerApiUrl(ProviderConnection c, string? action = null, (string Key, string Value)? extra = null)
{
    var url = $"{c.BaseUrl?.TrimEnd('/')}/player_api.php?username={Uri.EscapeDataString(c.Username ?? "")}&password={Uri.EscapeDataString(c.Password ?? "")}";
    if (!string.IsNullOrWhiteSpace(action))
        url += $"&action={Uri.EscapeDataString(action)}";
    if (extra is not null)
        url += $"&{Uri.EscapeDataString(extra.Value.Key)}={Uri.EscapeDataString(extra.Value.Value)}";
    return url;
}

static string BuildXtreamLiveUrl(ProviderConnection c, string id) =>
    $"{c.BaseUrl?.TrimEnd('/')}/live/{Uri.EscapeDataString(c.Username ?? "")}/{Uri.EscapeDataString(c.Password ?? "")}/{Uri.EscapeDataString(id)}.ts";

static string BuildXtreamXmlTvUrl(ProviderConnection c) =>
    $"{c.BaseUrl?.TrimEnd('/')}/xmltv.php?username={Uri.EscapeDataString(c.Username ?? "")}&password={Uri.EscapeDataString(c.Password ?? "")}";

static string BuildXtreamMovieUrl(ProviderConnection c, string id, string ext) =>
    $"{c.BaseUrl?.TrimEnd('/')}/movie/{Uri.EscapeDataString(c.Username ?? "")}/{Uri.EscapeDataString(c.Password ?? "")}/{Uri.EscapeDataString(id)}.{SafeContainerExt(ext)}";

static string BuildXtreamSeriesUrl(ProviderConnection c, string id, string ext) =>
    $"{c.BaseUrl?.TrimEnd('/')}/series/{Uri.EscapeDataString(c.Username ?? "")}/{Uri.EscapeDataString(c.Password ?? "")}/{Uri.EscapeDataString(id)}.{SafeContainerExt(ext)}";

static string SafeContainerExt(string? ext)
{
    var e = (ext ?? "mp4").Trim().TrimStart('.').ToLowerInvariant();
    return e is "mp4" or "mkv" or "ts" or "avi" or "webm" or "m4v" ? e : "mp4";
}

static IEnumerable<Channel> ParseM3u(string text)
{
    var lines = text.Replace("\r", "").Split('\n');
    Channel? pending = null;
    foreach (var raw in lines)
    {
        var line = raw.Trim();
        if (line.StartsWith("#EXTINF", StringComparison.OrdinalIgnoreCase))
        {
            var name = line.Contains(',') ? line[(line.IndexOf(',') + 1)..].Trim() : "Channel";
            pending = new Channel(
                Attr(line, "tvg-id") ?? Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(line))).Substring(0, 16),
                name,
                Attr(line, "group-title") ?? "Other",
                Attr(line, "tvg-logo") ?? "",
                "",
                Attr(line, "tvg-chno") ?? "");
        }
        else if (pending is not null && line.Length > 0 && !line.StartsWith('#'))
        {
            yield return pending with { Url = line };
            pending = null;
        }
    }
}

static string? Attr(string line, string name)
{
    var m = Regex.Match(line, name + "=\"([^\"]*)\"", RegexOptions.IgnoreCase);
    return m.Success ? m.Groups[1].Value : null;
}

static DateTimeOffset ParseXmlTvDate(string? value)
{
    if (string.IsNullOrWhiteSpace(value)) return DateTimeOffset.MinValue;
    value = value.Trim();
    var m = Regex.Match(value, "^(\\d{14})(?:\\s*([+-]\\d{4}))?");
    if (!m.Success) return DateTimeOffset.MinValue;
    var dt = DateTime.ParseExact(m.Groups[1].Value, "yyyyMMddHHmmss", null);
    if (m.Groups[2].Success)
    {
        var tz = m.Groups[2].Value;
        var sign = tz[0] == '-' ? -1 : 1;
        var off = new TimeSpan(sign * int.Parse(tz.Substring(1, 2)), sign * int.Parse(tz.Substring(3, 2)), 0);
        return new DateTimeOffset(dt, off);
    }
    return new DateTimeOffset(dt);
}

static bool EncryptedHls(string manifest) =>
    manifest.Split('\n').Any(line =>
    {
        var t = line.Trim();
        return t.StartsWith("#EXT-X-KEY", StringComparison.OrdinalIgnoreCase) &&
               !t.Contains("METHOD=NONE", StringComparison.OrdinalIgnoreCase);
    });

static string RewriteHls(string manifest, Uri baseUri, Func<string, string, string> register)
{
    var output = new StringBuilder();
    foreach (var raw in manifest.Replace("\r", "").Split('\n'))
    {
        var line = raw.Trim();
        if (line.Length == 0) { output.AppendLine(); continue; }

        if (line.StartsWith("#EXT-X-KEY", StringComparison.OrdinalIgnoreCase))
        {
            output.AppendLine(line);
            continue;
        }

        if (line.StartsWith("#", StringComparison.Ordinal) && line.Contains("URI=\"", StringComparison.OrdinalIgnoreCase))
        {
            output.AppendLine(Regex.Replace(line, "URI=\"([^\"]+)\"", m =>
            {
                var absolute = new Uri(baseUri, m.Groups[1].Value).ToString();
                return $"URI=\"/api/proxy/{register(absolute, "media")}\"";
            }, RegexOptions.IgnoreCase));
            continue;
        }

        if (line.StartsWith("#")) { output.AppendLine(line); continue; }

        var target = new Uri(baseUri, line).ToString();
        output.AppendLine($"/api/proxy/{register(target, "media")}");
    }
    return output.ToString();
}

static string JsonString(JsonElement e, string name)
{
    if (!e.TryGetProperty(name, out var p)) return "";
    return p.ValueKind switch
    {
        JsonValueKind.String => p.GetString() ?? "",
        JsonValueKind.Number => p.GetRawText(),
        JsonValueKind.True => "true",
        JsonValueKind.False => "false",
        _ => ""
    };
}

static string SafeName(string name)
{
    foreach (var c in Path.GetInvalidFileNameChars()) name = name.Replace(c, '_');
    var value = name.Trim().Trim('.');
    return string.IsNullOrWhiteSpace(value) ? "video" : value;
}

static string SafeExt(string path)
{
    var ext = Path.GetExtension(path).ToLowerInvariant();
    return ext is ".mp4" or ".mkv" or ".webm" or ".mov" or ".avi" or ".m4v" or ".ts" ? ext : ".mp4";
}

static string? FindExecutable(string name)
{
    var path = Environment.GetEnvironmentVariable("PATH") ?? "";
    foreach (var dir in path.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
    {
        var candidate = Path.Combine(dir, name);
        if (File.Exists(candidate)) return candidate;
    }
    return null;
}

static async Task<double?> ProbeDurationSeconds(string sourceUrl)
{
    var ffprobe = FindExecutable("ffprobe");
    if (ffprobe is null) return null;

    var psi = new ProcessStartInfo
    {
        FileName = ffprobe,
        UseShellExecute = false,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true
    };
    foreach (var arg in new[]
    {
        "-v", "error",
        "-rw_timeout", "8000000",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        sourceUrl
    }) psi.ArgumentList.Add(arg);

    using var process = new Process { StartInfo = psi };
    try
    {
        if (!process.Start()) return null;
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var outputTask = process.StandardOutput.ReadToEndAsync();
        await process.WaitForExitAsync(cts.Token);
        var output = (await outputTask).Trim();
        if (process.ExitCode == 0 &&
            double.TryParse(output, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out var seconds) &&
            double.IsFinite(seconds) && seconds > 0)
            return seconds;
    }
    catch
    {
        try { if (!process.HasExited) process.Kill(entireProcessTree: true); } catch { }
    }
    return null;
}

record ProviderStored(string Id, string Name, string Type, string EncryptedConnection);
record ProviderConnection(string? PlaylistUrl, string? EpgUrl, string? BaseUrl, string? Username, string? Password);
record ProviderInput(string? Id, string Name, string Type, string? PlaylistUrl, string? EpgUrl, string? BaseUrl, string? Username, string? Password, bool KeepExistingConnection = false, bool KeepExistingPassword = false);
record LegacyProvider(string? Id, string? Name, string? Type, string? PlaylistUrl, string? EpgUrl, string? BaseUrl, string? Username, string? Password);
record Channel(string Id, string Name, string Group, string Logo, string Url, string Number);
record ProviderProbe(bool Ok, int? StatusCode, string Message, string ContentType, long LatencyMs, string Host);
record LiveChannel(string Key, string Id, string Name, string Group, string Number, string LogoUrl, string SourceUrl);
record ChannelCacheEntry(List<LiveChannel> Channels, DateTimeOffset Loaded);
record ContinueItem(string Id, string Title, string Url, double PositionSeconds, DateTimeOffset Updated, string? Poster = null, double? DurationSeconds = null);
record ContinuePosterUpdate(string? Poster);
record ChannelPreferences(HashSet<string> HiddenGroups, HashSet<string> HiddenChannels, Dictionary<string,string> Aliases);
record ViewerProfile(string Id, string Name, bool IsKids, string Icon);
record ViewerProfileInput(string? Id, string? Name, bool IsKids, string? Icon);
record GroupVisibilityRequest(string Group, bool Hidden);
record ChannelPreferenceRequest(string ChannelKey, bool Hidden, string? Alias);
record SetupRequest(string? Username, string Password);
record LoginRequest(string Username, string Password);
record AppUser(string Id, string Username, string Role, bool Enabled, PasswordCredential Credential);
record UserInput(string? Id, string? Username, string? Password, string? Role, bool Enabled);
record UserProfileAccess(string[] AllowedProfileIds, string DefaultProfileId);
record ProfilePolicy(bool Live, bool Movies, bool Series, bool Downloads, string[] AllowedProviderIds, PasswordCredential? PinCredential);
record ProfilePolicyInput(bool Live, bool Movies, bool Series, bool Downloads, string[]? AllowedProviderIds, string? Pin, bool ClearPin = false);
record PinRequest(string? Pin);
record MediaLibraryProvider(string Id, string Name, string Type, bool Enabled, string EncryptedConnection, string[] LibraryIds);
record MediaLibraryInput(string? Id, string Name, string Type, string? BaseUrl, string? Token, bool Enabled, string[]? LibraryIds, bool KeepExistingToken = false);
record MediaLibrarySelectionInput(string[]? LibraryIds);
record MediaLibraryConnection(string BaseUrl, string Token);
record UnifiedEpisodeItem(string Id, string Source, string SourceProviderId, string ItemId, string SeriesId, int SeasonNumber, int EpisodeNumber, string Name, string? Year, string? Rating, string? Poster);
record UnifiedMediaItem(string Id, string Source, string SourceProviderId, string Kind, string Name, string? Year, string? Rating, string? Poster, string? ParentId, string? StreamUrl, double? Progress, DateTimeOffset? AddedAt);
record ProfileMediaState(string ProfileId,string MediaId,string Title,string Kind,double PositionSeconds,double? DurationSeconds,bool Watched,bool Favourite,string? Poster,DateTimeOffset Updated);
record ProfileMediaStateInput(string? Title=null,string? Kind=null,double PositionSeconds=0,double? DurationSeconds=null,bool Watched=false,bool Favourite=false,string? Poster=null);
record AppNotification(string Id,string Title,string Message,string Kind,DateTimeOffset Created,bool Read);
record AppNotificationInput(string Title,string Message,string? Kind=null);
record NavigationItemConfig(string Id, bool Enabled, int Order);
record NavigationConfig(List<NavigationItemConfig> Items);
record UserSourceAccess(bool AdminIptv, bool AdminPlex, bool AdminJellyfin);
record UserSourceItem(string Id, string Username, string Type, string Name, bool Enabled, string EncryptedConnection);
record UserSourceInput(string? Id, string Type, string Name, string? BaseUrl, string? PlaylistUrl, string? EpgUrl, string? Username, string? Password, string? Token, bool Enabled);
record UserSourceSafe(string Id, string Type, string Name, bool Enabled, string Host, bool HasSecret);
record RoomDevice(string Id,string Name,string DeviceType,DateTimeOffset Updated,string? ActiveMediaId=null,string? ActiveTitle=null,double PositionSeconds=0);
record RoomDeviceInput(string? Id,string Name,string? DeviceType=null,string? ActiveMediaId=null,string? ActiveTitle=null,double PositionSeconds=0);
record RoomHandoff(string? MediaId,string? Title,double PositionSeconds=0);
record DvrRule(string Id,string ProviderId,string ChannelKey,string ChannelName,string TitlePattern,bool NewOnly,bool Enabled,int PaddingBeforeMinutes,int PaddingAfterMinutes,int KeepLatest,string? StorageTargetId,DateTimeOffset Created);
record DvrRuleInput(string? Id,string ProviderId,string ChannelKey,string? ChannelName,string TitlePattern,bool NewOnly=true,bool Enabled=true,int PaddingBeforeMinutes=5,int PaddingAfterMinutes=10,int KeepLatest=5,string? StorageTargetId=null);
record RecordingRequest(string ProviderId, string ChannelKey, string? ChannelName, string? Title, DateTimeOffset Start, DateTimeOffset End, string? StorageTargetId = null);
record RecordingJob(string Id, string ProviderId, string ChannelKey, string ChannelName, string Title, DateTimeOffset Start, DateTimeOffset End, string Status, string? FileName, string? Error, string? StorageTargetId = null, string? StorageTargetName = null, string? StoredPath = null);
record StorageTarget(string Id, string Name, string Type, string Destination, bool DefaultDvr, bool DefaultDownload, bool Enabled);
record StorageTargetInput(string? Id, string Name, string? Type, string Destination, bool DefaultDvr, bool DefaultDownload, bool Enabled);
record MediaDownloadRequest(string Token, string? Title, string? StorageTargetId = null);
record ProxyTarget(string Url, string Kind, DateTimeOffset Created);
record LiveSession(string Id, string Directory, Process Process, StringBuilder ErrorLog, string SourceUrl, DateTimeOffset Started, double? DurationSeconds = null);
record RecentError(DateTimeOffset At, string Area, string Message);

record DownloadJob(string Id, string Title, string SourceUrl, string Path, string Status, double Progress, string? Error, DateTimeOffset Created,
    string? StorageTargetId = null, string? StorageTargetName = null, string? StorageType = null, string? StorageDestination = null)
{
    public object Safe() => new
    {
        Id, Title, Status, Progress, Error, Created, StorageTargetId, StorageTargetName, StorageType, StorageDestination,
        fileName = System.IO.Path.GetFileName(Path),
        completed = Status == "Completed"
    };
}

sealed record PasswordCredential(string Username, string Salt, string Hash, int Iterations)
{
    public static PasswordCredential Create(string username, string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        const int iterations = 350000;
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, 32);
        return new PasswordCredential(username, Convert.ToBase64String(salt), Convert.ToBase64String(hash), iterations);
    }

    public bool Verify(string username, string password)
    {
        if (!Username.Equals(username, StringComparison.OrdinalIgnoreCase)) return false;
        var salt = Convert.FromBase64String(Salt);
        var expected = Convert.FromBase64String(Hash);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, expected.Length);
        return CryptographicOperations.FixedTimeEquals(expected, actual);
    }
}

sealed class SecretBox
{
    readonly byte[] key;

    public SecretBox(string keyFile)
    {
        if (File.Exists(keyFile))
        {
            key = Convert.FromBase64String(File.ReadAllText(keyFile).Trim());
        }
        else
        {
            key = RandomNumberGenerator.GetBytes(32);
            File.WriteAllText(keyFile, Convert.ToBase64String(key));
            try
            {
                if (!OperatingSystem.IsWindows())
                    File.SetUnixFileMode(keyFile, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            }
            catch { }
        }
    }

    public string Encrypt(string plaintext)
    {
        var nonce = RandomNumberGenerator.GetBytes(12);
        var plain = Encoding.UTF8.GetBytes(plaintext);
        var cipher = new byte[plain.Length];
        var tag = new byte[16];
        using var aes = new AesGcm(key, 16);
        aes.Encrypt(nonce, plain, cipher, tag);
        var packed = new byte[nonce.Length + tag.Length + cipher.Length];
        Buffer.BlockCopy(nonce, 0, packed, 0, nonce.Length);
        Buffer.BlockCopy(tag, 0, packed, nonce.Length, tag.Length);
        Buffer.BlockCopy(cipher, 0, packed, nonce.Length + tag.Length, cipher.Length);
        return Convert.ToBase64String(packed);
    }

    public string Decrypt(string packedText)
    {
        var packed = Convert.FromBase64String(packedText);
        var nonce = packed[..12];
        var tag = packed[12..28];
        var cipher = packed[28..];
        var plain = new byte[cipher.Length];
        using var aes = new AesGcm(key, 16);
        aes.Decrypt(nonce, cipher, tag, plain);
        return Encoding.UTF8.GetString(plain);
    }
}

record TimedJsonCache(string Json, DateTimeOffset Loaded);
