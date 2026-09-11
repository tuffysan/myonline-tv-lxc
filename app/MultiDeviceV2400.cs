public static class MultiDeviceV2400
{
    public static object Capabilities() => new
    {
        version = "28.0.0",
        feature = "Multi-device Platform",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Browser/mobile/tablet/TV/Android-TV device platform."
    };
}
