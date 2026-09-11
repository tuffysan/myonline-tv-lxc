namespace MyOnlineTV.Web;

public sealed record RoomDeviceState(
    string DeviceId,
    string Name,
    bool Online,
    string? MediaKind,
    string? MediaId,
    long PositionMs,
    bool Playing);

public sealed record HandoffRequest(
    string FromDeviceId,
    string ToDeviceId,
    string MediaKind,
    string MediaId,
    long PositionMs);

public sealed class HandoffPolicy
{
    public bool CanHandoff(RegisteredDevice from, RegisteredDevice to) =>
        from.Trusted &&
        to.Trusted &&
        string.Equals(from.UserId, to.UserId, StringComparison.Ordinal);
}
