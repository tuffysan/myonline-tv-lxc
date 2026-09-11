public static class PairingPolicyV214
{
    public sealed record Pairing(string Code,string DeviceName,DateTimeOffset Expires);
    public static Pairing Create(string deviceName)=>new(Random.Shared.Next(100000,999999).ToString(),deviceName,DateTimeOffset.UtcNow.AddMinutes(5));
    public static bool Valid(Pairing p,string code)=>DateTimeOffset.UtcNow<p.Expires&&System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(System.Text.Encoding.UTF8.GetBytes(p.Code),System.Text.Encoding.UTF8.GetBytes(code??""));
    public static bool CommandAllowed(string command)=>new[]{"play","pause","stop","next","previous","channel-up","channel-down","seek"}.Contains((command??"").ToLowerInvariant());
}