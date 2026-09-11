public static class CatchupPolicyV216
{
    public sealed record Capability(bool Catchup,bool StartOver,int MaxDays);
    public static bool CanStartOver(Capability c,DateTimeOffset start,DateTimeOffset stop,DateTimeOffset now)=>
      c.StartOver && start<=now && stop>=now.AddHours(-24);
    public static bool CanCatchup(Capability c,DateTimeOffset stop,DateTimeOffset now)=>
      c.Catchup && stop<=now && stop>=now.AddDays(-Math.Max(0,c.MaxDays));
}