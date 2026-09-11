public static class StableReleaseGateV220
{
    public sealed record Gate(string Name,bool Passed,string? Evidence);
    public static object Evaluate(IEnumerable<Gate> gates){
      var all=gates.ToList(); var failed=all.Where(x=>!x.Passed).ToList();
      return new { promotable=failed.Count==0, passed=all.Count-failed.Count, failed=failed.Count, failures=failed,
        mandatoryRuntimeCostSek=0, externalAiDefault="disabled", featureFreeze=true };
    }
}