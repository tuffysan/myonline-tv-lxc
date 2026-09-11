namespace MyOnlineTV.Web;

public sealed class RemoteControlPolicy
{
    public bool CanControl(RegisteredDevice controller, RegisteredDevice target) =>
        controller.Trusted &&
        target.Trusted &&
        string.Equals(controller.UserId, target.UserId, StringComparison.Ordinal);

    public RealtimeEnvelope Command(string targetDeviceId, string type, object? payload = null) =>
        new(type, targetDeviceId, Guid.NewGuid().ToString("N"), payload, DateTimeOffset.UtcNow);
}
