public static class PersonalHomeV2380
{
    public static object Capabilities() => new
    {
        version = AppIdentity.Version,
        feature = "Personal Home",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Personal local Home rail composition."
    };
}
