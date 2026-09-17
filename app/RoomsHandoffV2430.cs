public static class RoomsHandoffV2430
{
    public static object Capabilities() => new
    {
        version = AppIdentity.Version,
        feature = "Rooms & Handoff",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Local room playback ownership and handoff contract."
    };
}
