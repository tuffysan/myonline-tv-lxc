namespace MyOnlineTV.Web;

public sealed class OperationsAggregator
{
    public OperationsSnapshot Snapshot(
        double cpuPercent, long memoryUsedBytes, long diskFreeBytes,
        int activeStreams, int ffmpegProcesses, int dvrJobs,
        int onlineClients, int recentErrors, string version)
        => new(
            Math.Max(0, cpuPercent),
            Math.Max(0, memoryUsedBytes),
            Math.Max(0, diskFreeBytes),
            Math.Max(0, activeStreams),
            Math.Max(0, ffmpegProcesses),
            Math.Max(0, dvrJobs),
            Math.Max(0, onlineClients),
            Math.Max(0, recentErrors),
            version,
            DateTimeOffset.UtcNow);
}
