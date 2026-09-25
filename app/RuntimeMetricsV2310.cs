public static class RuntimeMetricsV2310
{
    public static object Capabilities() => new
    {
        version = AppIdentity.Version,
        feature = "Performance & Diagnostics",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Local performance measurements and diagnostics."
    };
}
