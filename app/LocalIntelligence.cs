namespace MyOnlineTV.Web;

public sealed record LocalIntent(string Type,string Query,IReadOnlyDictionary<string,string> Parameters);

public sealed class LocalIntentParser
{
    public LocalIntent Parse(string input)
    {
        var q=(input ?? "").Trim();
        var lower=q.ToLowerInvariant();
        if (lower.Contains("fortsätt")) return new("continue",q,new Dictionary<string,string>());
        if (lower.Contains("sport") || lower.Contains("match")) return new("sports",q,new Dictionary<string,string>());
        if (lower.Contains("film")) return new("movie",q,new Dictionary<string,string>());
        if (lower.Contains("serie")) return new("series",q,new Dictionary<string,string>());
        return new("search",q,new Dictionary<string,string>());
    }
}

public sealed record LocalIntelligenceOptions(
    bool Enabled=true,
    bool ExternalNetworkAllowed=false,
    int ExternalMonthlyBudgetSek=0);
