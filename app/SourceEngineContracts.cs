namespace MyOnlineTV.Web;
public sealed record EffectiveSource(string Id,string Name,string Type,bool Available,string Scope,string? Reason=null);
public sealed record SourceResolution(string UserId,IReadOnlyList<EffectiveSource> Sources) {
    public bool Allows(string sourceId) => Sources.Any(x => x.Id == sourceId && x.Available);
}
