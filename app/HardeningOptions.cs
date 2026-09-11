namespace MyOnlineTV.Web;
public sealed record HardeningOptions(
    int ProviderTimeoutSeconds = 20,
    int PlaybackStartupTimeoutSeconds = 30,
    int RetryCount = 2,
    int MaxConcurrentFfmpeg = 4,
    int StaleSessionMinutes = 30);
public sealed record DependencyHealth(string Name, bool Healthy, string Detail, DateTimeOffset CheckedAt);
