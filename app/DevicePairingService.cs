using System.Collections.Concurrent;
namespace MyOnlineTV.Web;

public sealed class DevicePairingService
{
    private readonly ConcurrentDictionary<string, PairingChallenge> _challenges = new();
    private readonly ConcurrentDictionary<string, RegisteredDevice> _devices = new();

    public PairingChallenge Create(string deviceId, TimeSpan? lifetime = null)
    {
        var code = Random.Shared.Next(100000, 999999).ToString();
        var challenge = new PairingChallenge(
            code, deviceId, DateTimeOffset.UtcNow.Add(lifetime ?? TimeSpan.FromMinutes(5)));
        _challenges[code] = challenge;
        return challenge;
    }

    public RegisteredDevice Approve(string code, string userId, string deviceName, string clientType)
    {
        if (!_challenges.TryRemove(code, out var challenge) || challenge.ExpiresAt <= DateTimeOffset.UtcNow)
            throw new InvalidOperationException("Pairing code is invalid or expired.");
        var device = new RegisteredDevice(
            challenge.DeviceId, userId, deviceName, clientType, true, DateTimeOffset.UtcNow);
        _devices[device.Id] = device;
        return device;
    }

    public IReadOnlyCollection<RegisteredDevice> Devices(string userId) =>
        _devices.Values.Where(x => x.UserId == userId).ToArray();

    public bool Revoke(string userId, string deviceId) =>
        _devices.TryGetValue(deviceId, out var d) && d.UserId == userId && _devices.TryRemove(deviceId, out _);
}
