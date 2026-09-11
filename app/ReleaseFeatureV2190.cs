public static class ApplianceRecoveryV219
{
    public sealed record Signal(string Name,bool Healthy,string? Detail);
    public static object Evaluate(IEnumerable<Signal> signals){
      var bad=signals.Where(x=>!x.Healthy).ToList();
      return new { healthy=bad.Count==0, failures=bad, actions=bad.Select(x=>x.Name switch{
        "web"=>"restart-web","ffmpeg"=>"restart-stream-session","disk"=>"stop-new-recordings","provider"=>"retry-provider",_=>"log-only"}).Distinct().ToArray()
      };
    }
}