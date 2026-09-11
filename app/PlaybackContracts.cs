namespace MyOnlineTV.Web;
public enum PlaybackMode { Direct, Hls, Remux, Transcode }
public sealed record PlaybackRequest(string Kind,string SourceId,string MediaId,long ResumePositionMs=0,string? ClientId=null);
public sealed record PlaybackResponse(PlaybackMode Mode,string Url,DateTimeOffset? ExpiresAt=null,long ResumePositionMs=0,string? SessionId=null);
