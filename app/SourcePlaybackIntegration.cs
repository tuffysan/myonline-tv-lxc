namespace MyOnlineTV.Web;

public sealed record SourceAccessDecision(bool Allowed, string? Reason = null);

public sealed class SourceAccessPolicy
{
    public SourceAccessDecision CanUse(
        string userId,
        string sourceId,
        IEnumerable<EffectiveSource> effectiveSources)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return new(false, "Unauthenticated");
        var source = effectiveSources.FirstOrDefault(x => x.Id == sourceId);
        if (source is null) return new(false, "Source not assigned");
        if (!source.Available) return new(false, source.Reason ?? "Source unavailable");
        return new(true);
    }
}

public sealed class PlaybackResolver
{
    public PlaybackResponse Resolve(
        PlaybackRequest request,
        SourceAccessDecision access,
        string playbackUrl,
        PlaybackMode preferredMode = PlaybackMode.Hls)
    {
        if (!access.Allowed)
            throw new UnauthorizedAccessException(access.Reason ?? "Source access denied");
        if (string.IsNullOrWhiteSpace(playbackUrl))
            throw new InvalidOperationException("No playback URL was resolved.");
        return new PlaybackResponse(
            preferredMode,
            playbackUrl,
            DateTimeOffset.UtcNow.AddMinutes(10),
            Math.Max(0, request.ResumePositionMs),
            Guid.NewGuid().ToString("N"));
    }
}
