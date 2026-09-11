namespace MyOnlineTV.Web;

public sealed record DvrRule(
    string Id, string UserId, string TitlePattern, string? ChannelId,
    bool SeriesRule, int Priority = 50, int KeepCount = 0, bool Enabled = true);

public sealed record DvrCandidate(
    string ProgrammeId, string ChannelId, string Title,
    DateTimeOffset Start, DateTimeOffset Stop, int Priority);

public sealed record DvrConflict(DvrCandidate Candidate, string Reason);

public sealed class DvrConflictDetector
{
    public IReadOnlyList<DvrConflict> Find(
        IEnumerable<DvrCandidate> candidates, int maxConcurrentRecordings)
    {
        if (maxConcurrentRecordings < 1) throw new ArgumentOutOfRangeException(nameof(maxConcurrentRecordings));
        var list = candidates.OrderBy(x => x.Start).ToList();
        var conflicts = new List<DvrConflict>();
        foreach (var item in list)
        {
            var overlapping = list.Count(x => x.ProgrammeId != item.ProgrammeId &&
                x.Start < item.Stop && x.Stop > item.Start && x.Priority >= item.Priority);
            if (overlapping >= maxConcurrentRecordings)
                conflicts.Add(new DvrConflict(item, "Concurrent recording limit exceeded"));
        }
        return conflicts;
    }
}
