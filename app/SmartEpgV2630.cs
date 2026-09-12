public static class SmartEpgV2630
{
 public static object Capabilities()=>new{version="31.1.3",feature="Smart EPG",localFirst=true,mandatoryRuntimeCostSek=0,productionVerified=false};
 public static double Score(bool favourite,bool watched,double metadata)=>metadata+(favourite?30:0)+(watched?10:0);
}
