namespace MyOnlineTV.Web;
public sealed record OperationsSnapshot(
 double CpuPercent,long MemoryUsedBytes,long DiskFreeBytes,int ActiveStreams,int FfmpegProcesses,
 int DvrJobs,int OnlineClients,int RecentErrors,string Version,DateTimeOffset CapturedAt);
