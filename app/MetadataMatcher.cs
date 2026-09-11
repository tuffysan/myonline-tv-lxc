namespace MyOnlineTV.Web;

public sealed class MetadataMatcher
{
    public static string NormalizeTitle(string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return "";
        var chars = title.Trim().ToLowerInvariant()
            .Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c))
            .ToArray();
        return string.Join(' ', new string(chars)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    public bool Same(MediaIdentity a, MediaIdentity b)
    {
        if (!string.IsNullOrWhiteSpace(a.ImdbId) && a.ImdbId == b.ImdbId) return true;
        if (!string.IsNullOrWhiteSpace(a.TmdbId) && a.TmdbId == b.TmdbId) return true;
        return a.Kind == b.Kind &&
               NormalizeTitle(a.NormalizedTitle) == NormalizeTitle(b.NormalizedTitle) &&
               (!a.Year.HasValue || !b.Year.HasValue || a.Year == b.Year);
    }

    public MediaSourceCandidate? Preferred(IEnumerable<MediaSourceCandidate> candidates) =>
        candidates.Where(x => x.Available)
                  .OrderByDescending(x => x.QualityScore)
                  .FirstOrDefault();
}
