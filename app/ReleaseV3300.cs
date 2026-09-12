namespace MyOnlineTV;

public static class ReleaseV3300
{
    public static object Capabilities() => new
    {
        version = "33.0.0",
        milestone = "TV Experience",
        navigation = new { dpad = true, keyboard = true, back = true, focusRestore = true },
        home = new { rails = true, continueWatching = true, liveNow = true, favourites = true, recentlyAdded = true },
        guide = new { fullGuide = true, miniGuide = true, channelZapping = true },
        playbackOverlay = new { title = true, progress = true, reconnectState = true },
        artwork = new { lazyLoad = true, browserCache = true },
        formFactors = new[] { "desktop", "tablet", "tv", "pwa" }
    };
}
