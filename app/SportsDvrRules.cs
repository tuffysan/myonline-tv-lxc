namespace MyOnlineTV.Web;
public sealed record SportsPreference(string Name,string Kind,bool AutoRecord=false,int Priority=50);
public sealed record SeriesRecordingRule(string Id,string Title,bool NewEpisodesOnly,int Priority,int KeepCount);
public sealed class RecordingPriority {
 public static IEnumerable<T> Order<T>(IEnumerable<T> items,Func<T,int> priority) => items.OrderByDescending(priority);
}
