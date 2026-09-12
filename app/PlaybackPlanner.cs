public static class PlaybackPlanner
{
    public static object Plan(string mediaKind,bool browserDirect,bool sourceHls,bool allowFfmpeg)
    {
        var strategy=browserDirect?"direct":sourceHls?"hls":allowFfmpeg?"ffmpeg":"unsupported";
        return new { strategy, mediaKind, retry = strategy=="hls"||strategy=="ffmpeg", resume = mediaKind!="live" };
    }
}
