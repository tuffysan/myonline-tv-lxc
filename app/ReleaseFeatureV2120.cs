public static class DvrPolicyV212
{
    public sealed record Rule(string Id,string Title,bool NewOnly,int Priority,int RetainCount,string? StorageTarget);
    public sealed record Recording(string Id,string RuleId,DateTimeOffset Start,DateTimeOffset Stop,int Priority);
    public static IReadOnlyList<string> RetentionDeletes(IEnumerable<Recording> rows,int retain)=>rows.OrderByDescending(x=>x.Start).Skip(Math.Max(0,retain)).Select(x=>x.Id).ToList();
    public static Recording Winner(Recording a,Recording b)=>a.Priority>=b.Priority?a:b;
}