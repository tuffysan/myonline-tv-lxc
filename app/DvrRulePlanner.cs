public sealed class DvrRulePlanner
{
    public sealed record Rule(
        string Id,
        string ChannelId,
        string TitlePattern,
        bool NewEpisodesOnly,
        int Priority,
        int RetainCount,
        string? StorageTargetId,
        bool Enabled = true);

    public sealed record Programme(string Id, string ChannelId, string Title, DateTimeOffset Start, DateTimeOffset Stop, bool? IsNew);
    public sealed record PlannedRecording(string RuleId, Programme Programme, int Priority, string? StorageTargetId);

    public static IReadOnlyList<PlannedRecording> Plan(IEnumerable<Rule> rules, IEnumerable<Programme> programmes)
    {
        var enabled = rules.Where(r => r.Enabled).OrderByDescending(r => r.Priority).ToList();
        var result = new List<PlannedRecording>();
        foreach (var p in programmes.OrderBy(p => p.Start))
        {
            var match = enabled.FirstOrDefault(r =>
                r.ChannelId == p.ChannelId &&
                p.Title.Contains(r.TitlePattern, StringComparison.OrdinalIgnoreCase) &&
                (!r.NewEpisodesOnly || p.IsNew != false));
            if (match != null) result.Add(new PlannedRecording(match.Id,p,match.Priority,match.StorageTargetId));
        }
        return result;
    }

    public static IReadOnlyList<(PlannedRecording Winner, PlannedRecording Loser)> FindConflicts(IEnumerable<PlannedRecording> planned, int maxConcurrent)
    {
        var rows = planned.OrderBy(x => x.Programme.Start).ThenByDescending(x => x.Priority).ToList();
        var conflicts = new List<(PlannedRecording, PlannedRecording)>();
        foreach (var row in rows)
        {
            var overlapping = rows.Where(x => x != row && x.Programme.Start < row.Programme.Stop && x.Programme.Stop > row.Programme.Start).ToList();
            if (overlapping.Count + 1 <= maxConcurrent) continue;
            foreach (var loser in overlapping.Where(x => x.Priority < row.Priority))
                conflicts.Add((row,loser));
        }
        return conflicts.Distinct().ToList();
    }
}
