public static class FamilyGuestV2680
{
 public static object Capabilities()=>new{version=AppIdentity.Version,feature="Family & Guest",localFirst=true,mandatoryRuntimeCostSek=0,productionVerified=false};
 public static object Guest()=>new{id="guest",persistent=false,affectsRecommendations=false,saveHistory=false};
}
