using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
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
builder.WebHost.UseUrls("http://0.0.0.0:5080");

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

var app = builder.Build();

var dataDir = Environment.GetEnvironmentVariable("MYONLINE_DATA") ?? "/var/lib/myonlinetv";
Directory.CreateDirectory(dataDir);
var providersFile = Path.Combine(dataDir, "providers.json");
var favouritesFile = Path.Combine(dataDir, "favourites.json");
var continueFile = Path.Combine(dataDir, "continue-watching.json");
var adminFile = Path.Combine(dataDir, "admin.json");
var secretKeyFile = Path.Combine(dataDir, "secrets.key");
var downloadsDir = Path.Combine(dataDir, "downloads");
var backupsDir = Path.Combine(dataDir, "backups");
var versionFile = Path.Combine(dataDir, "version");
Directory.CreateDirectory(downloadsDir);
Directory.CreateDirectory(backupsDir);
var startedAt = DateTimeOffset.UtcNow;

var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = true };
var http = new HttpClient(new HttpClientHandler { AutomaticDecompression = DecompressionMethods.All })
{
    Timeout = TimeSpan.FromMinutes(30)
};
http.DefaultRequestHeaders.UserAgent.ParseAdd("MyOnline-TV-Web/0.3.2");

var secretBox = new SecretBox(secretKeyFile);
var proxyTokens = new ConcurrentDictionary<string, ProxyTarget>();
var downloads = new ConcurrentDictionary<string, DownloadJob>();

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

// Basic same-origin protection for cookie-authenticated state-changing API requests.
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Path.StartsWithSegments("/api") &&
        ctx.Request.Method is not ("GET" or "HEAD" or "OPTIONS") &&
        ctx.User.Identity?.IsAuthenticated == true)
    {
        var origin = ctx.Request.Headers.Origin.ToString();
        if (!string.IsNullOrWhiteSpace(origin))
        {
            var expected = $"{ctx.Request.Scheme}://{ctx.Request.Host}";
            if (!origin.Equals(expected, StringComparison.OrdinalIgnoreCase))
            {
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
    version = "0.3.2",
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
    checks["authConfigured"] = File.Exists(adminFile);

    return ready
        ? Results.Ok(new { status = "ready", version = "0.3.2", checks })
        : Results.Json(new { status = "not-ready", version = "0.3.2", checks }, statusCode: 503);
}).AllowAnonymous();

app.MapGet("/api/status", () => Results.Ok(new
{
    name = "MyOnline TV Web",
    version = "0.3.2",
    dataDir,
    platform = Environment.OSVersion.ToString(),
    authConfigured = File.Exists(adminFile),
    now = DateTimeOffset.UtcNow
})).AllowAnonymous();

app.MapGet("/api/auth/status", (HttpContext ctx) => Results.Ok(new
{
    configured = File.Exists(adminFile),
    authenticated = ctx.User.Identity?.IsAuthenticated == true,
    user = ctx.User.Identity?.Name
})).AllowAnonymous();

app.MapPost("/api/auth/setup", async (SetupRequest req, HttpContext ctx) =>
{
    if (File.Exists(adminFile)) return Results.Conflict("Administrator account is already configured.");
    if (!ValidPassword(req.Password)) return Results.BadRequest("Password must be at least 10 characters.");
    var user = string.IsNullOrWhiteSpace(req.Username) ? "admin" : req.Username.Trim();
    var credential = PasswordCredential.Create(user, req.Password);
    Save(adminFile, credential);
    await SignIn(ctx, user);
    return Results.Ok(new { user });
}).AllowAnonymous();

app.MapPost("/api/auth/login", async (LoginRequest req, HttpContext ctx) =>
{
    var credential = Load<PasswordCredential>(adminFile);
    if (credential is null || !credential.Verify(req.Username, req.Password))
    {
        await Task.Delay(350);
        return Results.Unauthorized();
    }
    await SignIn(ctx, credential.Username);
    return Results.Ok(new { user = credential.Username });
}).AllowAnonymous();

app.MapPost("/api/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok();
}).RequireAuthorization();

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
        c = new ProviderConnection(
            Clean(input.PlaylistUrl),
            Clean(input.EpgUrl),
            Clean(input.BaseUrl)?.TrimEnd('/'),
            Clean(input.Username),
            input.Password ?? "");
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

    return Results.Ok(new { stored.Id, stored.Name, stored.Type });
}).RequireAuthorization();

app.MapDelete("/api/providers/{id}", (string id) =>
{
    var list = LoadProviders();
    var changed = list.RemoveAll(x => x.Id == id) > 0;
    if (changed) Save(providersFile, list);
    return changed ? Results.NoContent() : Results.NotFound();
}).RequireAuthorization();

app.MapGet("/api/channels/{providerId}", async (string providerId) =>
{
    var p = LoadProviders().FirstOrDefault(x => x.Id == providerId);
    if (p is null) return Results.NotFound();
    try
    {
        var c = Connection(p);
        var url = p.Type == "xtream" ? BuildXtreamM3uUrl(c) : c.PlaylistUrl;
        if (string.IsNullOrWhiteSpace(url)) return Results.BadRequest("Provider has no playlist URL.");
        var text = await http.GetStringAsync(url);
        var channels = ParseM3u(text).Take(20000).Select(ch => new
        {
            ch.Id,
            ch.Name,
            ch.Group,
            ch.Number,
            logo = string.IsNullOrWhiteSpace(ch.Logo) ? "" : ProxyUrl(ch.Logo, "artwork"),
            playUrl = ProxyUrl(ch.Url, "media")
        });
        return Results.Ok(channels);
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
}).RequireAuthorization();

app.MapGet("/api/epg/{providerId}", async (string providerId, int? hours) =>
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
        var now = DateTimeOffset.Now;
        var span = Math.Clamp(hours ?? 6, 2, 24);
        var startWindow = now.AddHours(-1);
        var endWindow = now.AddHours(span);
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
    catch (Exception ex) { return Results.Problem(ex.Message); }
}).RequireAuthorization();

app.MapGet("/api/vod/{providerId}/categories", async (string providerId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        using var doc = await XtreamJson(resolved.Value.Connection, "get_vod_categories");
        return Results.Ok(doc.RootElement.EnumerateArray().Select(x => new
        {
            id = JsonString(x, "category_id"),
            name = JsonString(x, "category_name")
        }).ToList());
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
}).RequireAuthorization();

app.MapGet("/api/vod/{providerId}/items", async (string providerId, string? categoryId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        (string Key, string Value)? extra = string.IsNullOrWhiteSpace(categoryId) ? null : ("category_id", categoryId!);
        using var doc = await XtreamJson(resolved.Value.Connection, "get_vod_streams", extra);
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
                poster = ProxyArtwork(JsonString(x, "stream_icon")),
                playUrl = ProxyUrl(source),
                downloadToken = RegisterProxy(source, "download")
            });
        }
        return Results.Ok(rows);
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
}).RequireAuthorization();

app.MapGet("/api/series/{providerId}/categories", async (string providerId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        using var doc = await XtreamJson(resolved.Value.Connection, "get_series_categories");
        return Results.Ok(doc.RootElement.EnumerateArray().Select(x => new
        {
            id = JsonString(x, "category_id"),
            name = JsonString(x, "category_name")
        }).ToList());
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
}).RequireAuthorization();

app.MapGet("/api/series/{providerId}/items", async (string providerId, string? categoryId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        (string Key, string Value)? extra = string.IsNullOrWhiteSpace(categoryId) ? null : ("category_id", categoryId!);
        using var doc = await XtreamJson(resolved.Value.Connection, "get_series", extra);
        var rows = doc.RootElement.EnumerateArray().Take(5000).Select(x => new
        {
            id = JsonString(x, "series_id"),
            name = JsonString(x, "name"),
            year = JsonString(x, "year"),
            rating = JsonString(x, "rating"),
            poster = ProxyArtwork(JsonString(x, "cover"))
        }).ToList();
        return Results.Ok(rows);
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
}).RequireAuthorization();

app.MapGet("/api/series/{providerId}/{seriesId}", async (string providerId, string seriesId) =>
{
    var resolved = ResolveXtream(providerId);
    if (resolved is null) return Results.NotFound();
    try
    {
        using var doc = await XtreamJson(resolved.Value.Connection, "get_series_info", ("series_id", seriesId));
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
                        playUrl = ProxyUrl(source),
                        downloadToken = RegisterProxy(source, "download")
                    });
                }
            }
        }
        return Results.Ok(new
        {
            name = info.ValueKind == JsonValueKind.Object ? JsonString(info, "name") : "",
            plot = info.ValueKind == JsonValueKind.Object ? JsonString(info, "plot") : "",
            cover = info.ValueKind == JsonValueKind.Object ? ProxyArtwork(JsonString(info, "cover")) : "",
            episodes
        });
    }
    catch (Exception ex) { return Results.Problem(ex.Message); }
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

app.MapGet("/api/downloads", () =>
    Results.Ok(downloads.Values.OrderByDescending(x => x.Created).Select(x => x.Safe())))
    .RequireAuthorization();

app.MapPost("/api/downloads/media", (MediaDownloadRequest req) =>
{
    if (!proxyTokens.TryGetValue(req.Token, out var target) || target.Kind is not ("download" or "media"))
        return Results.BadRequest("The media token has expired. Reload the movie or episode list and try again.");

    var id = Guid.NewGuid().ToString("N");
    var title = SafeName(string.IsNullOrWhiteSpace(req.Title) ? "video" : req.Title);
    var ext = SafeExt(new Uri(target.Url).AbsolutePath);
    var path = Path.Combine(downloadsDir, $"{id}-{title}{ext}");
    var job = new DownloadJob(id, title, target.Url, path, "Queued", 0, null, DateTimeOffset.UtcNow);
    downloads[id] = job;
    _ = Task.Run(() => RunDownload(job));
    return Results.Accepted($"/api/downloads/{id}", job.Safe());
}).RequireAuthorization();

app.MapDelete("/api/downloads/{id}", (string id) =>
{
    if (!downloads.TryRemove(id, out var job)) return Results.NotFound();
    try { if (File.Exists(job.Path)) File.Delete(job.Path); } catch { }
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


app.MapGet("/api/system", () =>
{
    var driveRoot = Path.GetPathRoot(dataDir) ?? "/";
    var drive = new DriveInfo(driveRoot);
    var downloadCount = Directory.Exists(downloadsDir) ? Directory.EnumerateFiles(downloadsDir).Count() : 0;
    var backupCount = Directory.Exists(backupsDir) ? Directory.EnumerateFiles(backupsDir, "*.zip").Count() : 0;
    return Results.Ok(new
    {
        version = "0.3.2",
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
        disk = new
        {
            totalBytes = drive.TotalSize,
            freeBytes = drive.AvailableFreeSpace,
            usedBytes = drive.TotalSize - drive.AvailableFreeSpace
        }
    });
}).RequireAuthorization();

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
}).RequireAuthorization();

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
            "continue-watching.json", "version", "release.json"
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
}).RequireAuthorization();

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

app.MapFallbackToFile("index.html");
app.Run();

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

async Task<JsonDocument> XtreamJson(ProviderConnection c, string action, (string Key, string Value)? extra = null)
{
    var url = $"{c.BaseUrl!.TrimEnd('/')}/player_api.php?username={Uri.EscapeDataString(c.Username ?? "")}&password={Uri.EscapeDataString(c.Password ?? "")}&action={Uri.EscapeDataString(action)}";
    if (extra is not null)
        url += $"&{Uri.EscapeDataString(extra.Value.Key)}={Uri.EscapeDataString(extra.Value.Value)}";
    using var response = await http.GetAsync(url);
    response.EnsureSuccessStatusCode();
    await using var stream = await response.Content.ReadAsStreamAsync();
    return await JsonDocument.ParseAsync(stream);
}

string ProxyArtwork(string? url) =>
    string.IsNullOrWhiteSpace(url) ? "" : ProxyUrl(url, "artwork");

static async Task SignIn(HttpContext ctx, string username)
{
    var claims = new[] { new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, username) };
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

record ProviderStored(string Id, string Name, string Type, string EncryptedConnection);
record ProviderConnection(string? PlaylistUrl, string? EpgUrl, string? BaseUrl, string? Username, string? Password);
record ProviderInput(string? Id, string Name, string Type, string? PlaylistUrl, string? EpgUrl, string? BaseUrl, string? Username, string? Password, bool KeepExistingConnection = false);
record LegacyProvider(string? Id, string? Name, string? Type, string? PlaylistUrl, string? EpgUrl, string? BaseUrl, string? Username, string? Password);
record Channel(string Id, string Name, string Group, string Logo, string Url, string Number);
record ContinueItem(string Id, string Title, string Url, double PositionSeconds, DateTimeOffset Updated);
record SetupRequest(string? Username, string Password);
record LoginRequest(string Username, string Password);
record MediaDownloadRequest(string Token, string? Title);
record ProxyTarget(string Url, string Kind, DateTimeOffset Created);
record DownloadJob(string Id, string Title, string SourceUrl, string Path, string Status, double Progress, string? Error, DateTimeOffset Created)
{
    public object Safe() => new
    {
        Id, Title, Status, Progress, Error, Created,
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
