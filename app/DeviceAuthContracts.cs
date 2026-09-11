namespace MyOnlineTV.Web;
public sealed record RegisteredDevice(string Id,string UserId,string Name,string ClientType,bool Trusted,DateTimeOffset LastSeen);
public sealed record PairingChallenge(string Code,string DeviceId,DateTimeOffset ExpiresAt);
public sealed record DeviceToken(string Token,DateTimeOffset ExpiresAt,string DeviceId);
