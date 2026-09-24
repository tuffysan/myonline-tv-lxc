using Microsoft.Net.Http.Headers;

namespace MyOnlineTV;

internal static class DownloadHeaders
{
    public static void SetAttachment(HttpResponse response, string fileName)
    {
        var disposition = new ContentDispositionHeaderValue("attachment");
        // Match Results.File: ASCII fallback plus RFC 5987 UTF-8 filename*.
        disposition.SetHttpFileName(fileName);
        response.GetTypedHeaders().ContentDisposition = disposition;
    }
}
