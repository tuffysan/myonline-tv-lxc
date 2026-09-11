namespace MyOnlineTV.Web;
public sealed record MediaIdentity(string Kind,string NormalizedTitle,int? Year,string? ImdbId=null,string? TmdbId=null);
public sealed record MediaSourceCandidate(string SourceId,string MediaId,string Name,int QualityScore,bool Available);
public sealed record UnifiedMediaItem(MediaIdentity Identity,IReadOnlyList<MediaSourceCandidate> Sources,string? PreferredSourceId=null);
