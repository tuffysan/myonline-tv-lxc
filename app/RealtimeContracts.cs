namespace MyOnlineTV.Web;
public sealed record RealtimeEnvelope(string Type,string DeviceId,string CorrelationId,object? Payload,DateTimeOffset SentAt);
public static class RealtimeMessageTypes {
 public const string Play="play"; public const string Pause="pause"; public const string Tune="tune";
 public const string Search="search"; public const string Handoff="handoff"; public const string State="state";
}
