public static class SmartEpgV2630
{
 public static object Capabilities()=>new{version="30.0.1",feature="Smart EPG",localFirst=true,mandatoryRuntimeCostSek=0,productionVerified=false};
 public static double Score(bool favourite,bool watched,double metadata)=>metadata+(favourite?30:0)+(watched?10:0);
}
