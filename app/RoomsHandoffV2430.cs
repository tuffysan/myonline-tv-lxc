public static class RoomsHandoffV2430
{
    public static object Capabilities() => new
    {
        version = "31.1.2",
        feature = "Rooms & Handoff",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Local room playback ownership and handoff contract."
    };
}
