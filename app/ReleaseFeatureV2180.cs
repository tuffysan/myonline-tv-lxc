public static class LocalSmartTvV218
{
    public sealed record Item(string Id,string Title,string[] Genres,int WatchedCount,int FavouriteCount);
    public static IReadOnlyList<Item> Recommend(IEnumerable<Item> items,IEnumerable<string> preferredGenres,int limit=12){
      var pref=preferredGenres.ToHashSet(StringComparer.OrdinalIgnoreCase);
      return items.OrderByDescending(x=>x.Genres.Count(g=>pref.Contains(g))*10+x.FavouriteCount*3-x.WatchedCount).Take(limit).ToList();
    }
    public static object CostPolicy()=>new { externalAi="disabled",monthlyBudgetSek=0,commercialMetadataRequired=false };
}