public static class UnifiedSourceSelectorV209
{
    public sealed record Candidate(string SourceId,string SourceType,string ItemId,bool DirectPlay,bool LocalNetwork,int Quality,int LatencyRank);
    public static Candidate? Best(IEnumerable<Candidate> items)=>items
      .OrderByDescending(x=>x.DirectPlay).ThenByDescending(x=>x.LocalNetwork)
      .ThenByDescending(x=>x.Quality).ThenBy(x=>x.LatencyRank).FirstOrDefault();
}