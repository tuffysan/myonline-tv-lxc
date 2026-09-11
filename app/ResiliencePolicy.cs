namespace MyOnlineTV.Web;

public sealed record ResiliencePolicy(
    TimeSpan Timeout,
    int RetryCount,
    TimeSpan RetryDelay,
    int MaxConcurrentOperations);

public static class DefaultResilience
{
    public static readonly ResiliencePolicy Provider =
        new(TimeSpan.FromSeconds(20), 2, TimeSpan.FromMilliseconds(500), 8);

    public static readonly ResiliencePolicy Playback =
        new(TimeSpan.FromSeconds(30), 1, TimeSpan.FromMilliseconds(250), 4);
}
