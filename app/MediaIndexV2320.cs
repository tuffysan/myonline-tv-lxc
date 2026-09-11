public static class MediaIndexV2320
{
    public static object Capabilities() => new
    {
        version = "25.0.0",
        feature = "Server Media Index",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Local searchable media-index contract."
    };
}
