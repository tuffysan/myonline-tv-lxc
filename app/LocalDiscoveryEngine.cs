namespace MyOnlineTV.Web;
public sealed record DiscoverySignal(string MediaId,string Genre,double Weight,DateTimeOffset At);
public sealed record DiscoveryCandidate(string MediaId,IReadOnlyList<string> Genres,double Popularity);
public sealed class LocalDiscoveryEngine {
 public IReadOnlyList<string> Recommend(IEnumerable<DiscoverySignal> history,IEnumerable<DiscoveryCandidate> candidates,int count=20) {
   var prefs=history.GroupBy(x=>x.Genre,StringComparer.OrdinalIgnoreCase)
     .ToDictionary(g=>g.Key,g=>g.Sum(x=>x.Weight),StringComparer.OrdinalIgnoreCase);
   return candidates.Select(c=>new {c.MediaId,Score=c.Popularity+c.Genres.Sum(g=>prefs.TryGetValue(g,out var w)?w:0)})
     .OrderByDescending(x=>x.Score).Take(Math.Max(1,count)).Select(x=>x.MediaId).ToArray();
 }
}
public enum AiProviderMode { Disabled, LocalOptional, ExternalOptional }
public sealed record AiFeatureOptions(AiProviderMode Mode=AiProviderMode.Disabled,string? Endpoint=null,string? Model=null,int MonthlyBudgetSek=0);
