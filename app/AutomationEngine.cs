namespace MyOnlineTV.Web;

public sealed record AutomationTrigger(string Type,string Value);
public sealed record AutomationAction(string Type,string Value);
public sealed record MediaAutomation(
    string Id,
    string Name,
    bool Enabled,
    AutomationTrigger Trigger,
    IReadOnlyList<AutomationAction> Actions);

public sealed class AutomationEngine
{
    public IEnumerable<AutomationAction> Match(IEnumerable<MediaAutomation> rules,string triggerType,string triggerValue) =>
        rules.Where(r=>r.Enabled &&
            r.Trigger.Type.Equals(triggerType,StringComparison.OrdinalIgnoreCase) &&
            r.Trigger.Value.Equals(triggerValue,StringComparison.OrdinalIgnoreCase))
        .SelectMany(r=>r.Actions);
}
