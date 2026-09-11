namespace MyOnlineTV.Web;

public sealed record StoredDevice(
    string Id,
    string UserId,
    string Name,
    string ClientType,
    bool Trusted,
    string TokenHash,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastSeen,
    DateTimeOffset? RevokedAt = null);

public sealed record DeviceAuditEvent(
    DateTimeOffset At,
    string DeviceId,
    string UserId,
    string Action,
    string? Detail = null);

public static class DeviceTokenPolicy
{
    public static bool IsActive(StoredDevice d) =>
        d.Trusted && d.RevokedAt is null && !string.IsNullOrWhiteSpace(d.TokenHash);
}
