namespace MyOnlineTV;

public static class ReleaseV3200
{
    public static object Capabilities() => new
    {
        version = "32.0.0",
        milestone = "Playback & Stability",
        playback = new
        {
            sharedCore = true,
            live = true,
            movies = true,
            series = true,
            direct = true,
            hls = true,
            ffmpegFallback = true,
            reconnect = true,
            resume = true
        },
        diagnostics = new
        {
            providerHealth = true,
            playbackHealth = true,
            sourceIsolation = true,
            exportableSnapshot = true
        },
        quality = new
        {
            previewBeforeRelease = true,
            smokeTestRequired = true,
            realProviderVerificationRequired = true
        }
    };
}
