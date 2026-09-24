using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Net.Http.Headers;
using MyOnlineTV;

// Run against Kestrel so invalid header characters fail as they do in production.
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:0");
await using var app = builder.Build();
byte[] payload = [1, 2, 3, 4];
app.MapGet("/stream", async (string name, HttpContext context) =>
{
    DownloadHeaders.SetAttachment(context.Response, name);
    await context.Response.Body.WriteAsync(payload);
});
app.MapGet("/file", (string name) =>
    Results.File(payload, "application/octet-stream", name, enableRangeProcessing: true));
await app.StartAsync();
try
{
    var address = app.Services.GetRequiredService<IServer>()
        .Features.Get<IServerAddressesFeature>()!.Addresses.Single();
    using var client = new HttpClient { BaseAddress = new Uri(address) };
    string[] names = ["video.mp4", "Räksmörgås.mp4", "ÅÄÖ åäö.mkv", "日本語 🎬.mkv",
        "quote\" and back\\slash.mp4", "line\r\nbreak\t\u007f.mp4", "100% 'special'; title.zip"];
    foreach (var name in names)
    {
        string? streamedHeader = null;
        foreach (var endpoint in new[] { "/stream", "/file" })
        {
            using var response = await client.GetAsync(endpoint + "?name=" + Uri.EscapeDataString(name));
            response.EnsureSuccessStatusCode();
            var header = response.Content.Headers.GetValues("Content-Disposition").Single();
            Check(header.All(c => c >= 0x20 && c < 0x7f), "Header must contain only printable ASCII");
            var disposition = ContentDispositionHeaderValue.Parse(header);
            Check(disposition.DispositionType == "attachment", "Attachment disposition missing");
            Check(disposition.FileName.HasValue, "ASCII fallback missing");
            Check(disposition.FileNameStar.ToString() == name, "UTF-8 filename must round-trip");
            Check(header.Contains("filename*=UTF-8''", StringComparison.OrdinalIgnoreCase), "RFC 5987 encoding missing");
            Check((await response.Content.ReadAsByteArrayAsync()).SequenceEqual(payload), "Download body changed");
            if (endpoint == "/stream") streamedHeader = header;
            else Check(header == streamedHeader, "Streaming and file download headers differ");
        }
    }
    using var request = new HttpRequestMessage(HttpMethod.Get, "/file?name=" + Uri.EscapeDataString("Räksmörgås.mp4"));
    request.Headers.Range = new System.Net.Http.Headers.RangeHeaderValue(1, 2);
    using var partial = await client.SendAsync(request);
    Check(partial.StatusCode == System.Net.HttpStatusCode.PartialContent, "Range support lost");
    Check((await partial.Content.ReadAsByteArrayAsync()).SequenceEqual(new byte[] { 2, 3 }), "Incorrect range body");
    Console.WriteLine($"PASS: {names.Length * 2} download cases and range request.");
}
finally
{
    await app.StopAsync();
}

static void Check(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
}
