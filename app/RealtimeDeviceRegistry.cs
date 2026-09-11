using System.Collections.Concurrent;
namespace MyOnlineTV.Web;

public sealed class RealtimeDeviceRegistry
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _seen = new();

    public void Touch(string deviceId) => _seen[deviceId] = DateTimeOffset.UtcNow;

    public bool IsOnline(string deviceId, TimeSpan? threshold = null)
    {
        if (!_seen.TryGetValue(deviceId, out var lastSeen)) return false;
        return DateTimeOffset.UtcNow - lastSeen <= (threshold ?? TimeSpan.FromSeconds(45));
    }

    public IReadOnlyDictionary<string, DateTimeOffset> Snapshot() =>
        new Dictionary<string, DateTimeOffset>(_seen);
}
