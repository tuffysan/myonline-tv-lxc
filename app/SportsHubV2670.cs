public static class SportsHubV2670
{
 public static object Capabilities()=>new{version="28.1.0",feature="Sports Hub",localFirst=true,mandatoryRuntimeCostSek=0,productionVerified=false};
 public static bool LooksLikeMatch(string title)=>new[]{" vs "," v "," - ","–"}.Any(x=>(title??"").Contains(x,StringComparison.OrdinalIgnoreCase));
}
