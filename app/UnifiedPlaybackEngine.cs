namespace MyOnlineTV.Web;

public sealed record PlaybackCapabilities(
    bool Direct = true,
    bool Hls = true,
    bool Remux = true,
    bool Transcode = true);

public sealed record PlaybackCandidate(
    PlaybackMode Mode,
    string Url,
    int Score,
    string? Reason = null);

public sealed class UnifiedPlaybackEngine
{
    public PlaybackResponse Select(
        PlaybackRequest request,
        SourceAccessDecision access,
        IEnumerable<PlaybackCandidate> candidates)
    {
        if (!access.Allowed)
            throw new UnauthorizedAccessException(access.Reason ?? "Source access denied.");

        var candidate = candidates
            .Where(x => !string.IsNullOrWhiteSpace(x.Url))
            .OrderByDescending(x => x.Score)
            .FirstOrDefault()
            ?? throw new InvalidOperationException("No playable candidate was available.");

        return new PlaybackResponse(
            candidate.Mode,
            candidate.Url,
            DateTimeOffset.UtcNow.AddMinutes(10),
            Math.Max(0, request.ResumePositionMs),
            Guid.NewGuid().ToString("N"));
    }
}
