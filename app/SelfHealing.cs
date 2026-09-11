namespace MyOnlineTV.Web;

public sealed record HealthSignal(string Component,bool Healthy,string? Detail,DateTimeOffset At);
public sealed record RecoveryAction(string Component,string Action,string Reason);

public sealed class SelfHealingPlanner
{
    public IReadOnlyList<RecoveryAction> Plan(IEnumerable<HealthSignal> signals) =>
        signals.Where(x=>!x.Healthy)
            .Select(x=> new RecoveryAction(
                x.Component,
                x.Component.Contains("ffmpeg",StringComparison.OrdinalIgnoreCase) ? "restart-session" : "retry",
                x.Detail ?? "Health check failed"))
            .ToArray();
}
