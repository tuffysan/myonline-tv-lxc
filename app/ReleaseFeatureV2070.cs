public static class PerformancePolicyV207
{
    public static object Snapshot() => new {
        homeCacheMinutes=5, providerTimeoutSeconds=12, catalogueTimeoutSeconds=20,
        maxParallelProviderRequests=4, posterRepair="background", paidCache=false
    };
    public static int ClampParallelism(int requested) => Math.Clamp(requested,1,4);
}