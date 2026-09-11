public sealed class GlobalSearchIndex
{
    public sealed record Entry(string Kind, string Id, string Title, string? Subtitle, string? SourceId, string? Route);
    private readonly object _gate = new();
    private List<Entry> _entries = new();

    public void Replace(IEnumerable<Entry> entries)
    {
        lock (_gate) _entries = entries.Where(x => !string.IsNullOrWhiteSpace(x.Title)).ToList();
    }

    public IReadOnlyList<Entry> Search(string? query, int limit = 50)
    {
        var q = (query ?? "").Trim();
        if (q.Length == 0) return Array.Empty<Entry>();
        lock (_gate)
            return _entries
                .Select(x => new { Item=x, Score=Score(x,q) })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Item.Title)
                .Take(Math.Clamp(limit,1,100))
                .Select(x => x.Item)
                .ToList();
    }

    private static int Score(Entry e, string q)
    {
        if (e.Title.Equals(q,StringComparison.OrdinalIgnoreCase)) return 100;
        if (e.Title.StartsWith(q,StringComparison.OrdinalIgnoreCase)) return 80;
        if (e.Title.Contains(q,StringComparison.OrdinalIgnoreCase)) return 60;
        if ((e.Subtitle??"").Contains(q,StringComparison.OrdinalIgnoreCase)) return 30;
        return 0;
    }
}
