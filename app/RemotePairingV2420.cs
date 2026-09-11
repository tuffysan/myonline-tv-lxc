public static class RemotePairingV2420
{
    public static object Capabilities() => new
    {
        version = "30.1.0",
        feature = "Phone Remote & Pairing",
        localFirst = true,
        mandatoryRuntimeCostSek = 0,
        productionVerified = false,
        description = "Local expiring pairing and validated remote commands."
    };
}
