public static class LiveTv4V2330
{
    public static object Capabilities() => new
    {
        version = "26.0.0",
        feature = "Live TV 4.0",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "TV-first zapping, Now/Next and previous-channel capabilities."
    };
}
