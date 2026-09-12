public static class UnifiedWatchlistV2650
{
 public static object Capabilities()=>new{version="31.1.3",feature="Unified Watchlist",localFirst=true,mandatoryRuntimeCostSek=0,productionVerified=false};
 public static string Identity(string kind,string title,int year)=>$"{kind}|{new string((title??"").ToLowerInvariant().Where(char.IsLetterOrDigit).ToArray())}|{year}";
}
