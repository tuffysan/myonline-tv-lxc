public static class RoomsHandoffV2430
{
    public static object Capabilities() => new
    {
        version = "30.0.2",
        feature = "Rooms & Handoff",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Local room playback ownership and handoff contract."
    };
}
