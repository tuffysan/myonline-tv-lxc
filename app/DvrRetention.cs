namespace MyOnlineTV.Web;

public sealed record DvrRetentionPolicy(
    int KeepCount = 0,
    int KeepDays = 0,
    bool DeleteWatched = false);

public sealed class DvrRetention
{
    public IEnumerable<T> Apply<T>(
        IEnumerable<T> recordings,
        Func<T, DateTimeOffset> recordedAt,
        Func<T, bool> watched,
        DvrRetentionPolicy policy)
    {
        var rows = recordings.OrderByDescending(recordedAt).ToList();

        if (policy.KeepDays > 0)
        {
            var cutoff = DateTimeOffset.UtcNow.AddDays(-policy.KeepDays);
            rows = rows.Where(x => recordedAt(x) >= cutoff).ToList();
        }

        if (policy.DeleteWatched)
            rows = rows.Where(x => !watched(x)).ToList();

        if (policy.KeepCount > 0)
            rows = rows.Take(policy.KeepCount).ToList();

        return rows;
    }
}
