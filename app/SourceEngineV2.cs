namespace MyOnlineTV.Web;

public sealed record SourceContext(
    string UserId,
    bool IsAdmin,
    IReadOnlyList<EffectiveSource> EffectiveSources);

public sealed class SourceEngineV2
{
    public SourceAccessDecision Authorize(SourceContext context, string sourceId)
    {
        if (context.IsAdmin) return new(true);
        var hit = context.EffectiveSources.FirstOrDefault(x => x.Id == sourceId);
        if (hit is null) return new(false, "Source is not assigned to this user.");
        if (!hit.Available) return new(false, hit.Reason ?? "Source unavailable.");
        return new(true);
    }

    public IReadOnlyList<EffectiveSource> Visible(SourceContext context) =>
        context.IsAdmin
            ? context.EffectiveSources
            : context.EffectiveSources.Where(x => x.Available).ToArray();

    public void Demand(SourceContext context, string sourceId)
    {
        var decision = Authorize(context, sourceId);
        if (!decision.Allowed)
            throw new UnauthorizedAccessException(decision.Reason ?? "Source access denied.");
    }
}
