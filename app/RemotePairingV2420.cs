public static class RemotePairingV2420
{
    public static object Capabilities() => new
    {
        version = "31.2.0",
        feature = "Phone Remote & Pairing",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Local expiring pairing and validated remote commands."
    };
}
