public static class SearchRankerV211
{
    public sealed record Hit(string Kind,string Id,string Title,string? Subtitle,int Recency=0);
    public static IReadOnlyList<Hit> Rank(IEnumerable<Hit> hits,string query,int limit=50){
      var q=(query??"").Trim(); if(q.Length==0)return Array.Empty<Hit>();
      return hits.Select(h=>new{h,s=h.Title.Equals(q,StringComparison.OrdinalIgnoreCase)?100:
        h.Title.StartsWith(q,StringComparison.OrdinalIgnoreCase)?80:h.Title.Contains(q,StringComparison.OrdinalIgnoreCase)?60:
        (h.Subtitle??"").Contains(q,StringComparison.OrdinalIgnoreCase)?30:0})
        .Where(x=>x.s>0).OrderByDescending(x=>x.s).ThenByDescending(x=>x.h.Recency).Take(Math.Clamp(limit,1,100)).Select(x=>x.h).ToList();
    }
}