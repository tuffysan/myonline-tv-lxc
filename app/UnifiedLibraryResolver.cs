public static class UnifiedLibraryResolver
{
    public sealed record Candidate(string SourceId, string SourceType, string ItemId, string Title, int? Year, string MediaType, string? Poster, string? Description);
    public sealed record UnifiedItem(string Key, Candidate Primary, IReadOnlyList<Candidate> Alternatives);

    public static IReadOnlyList<UnifiedItem> Merge(IEnumerable<Candidate> candidates)
    {
        static string Norm(string? value) => new string((value ?? "").Trim().ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray());
        return candidates
            .GroupBy(x => $"{x.MediaType.ToLowerInvariant()}|{Norm(x.Title)}|{x.Year?.ToString() ?? ""}")
            .Select(g =>
            {
                var list = g.ToList();
                var primary = list
                    .OrderByDescending(x => !string.IsNullOrWhiteSpace(x.Poster))
                    .ThenByDescending(x => !string.IsNullOrWhiteSpace(x.Description))
                    .First();
                return new UnifiedItem(g.Key, primary, list.Where(x => x != primary).ToList());
            })
            .ToList();
    }
}
