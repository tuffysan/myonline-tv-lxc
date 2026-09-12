public static class PlaybackResilienceV2360
{
    public static object Capabilities() => new
    {
        version = "30.2.0",
        feature = "Playback Resilience",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Bounded playback fallback plan and useful error stages."
    };
}
