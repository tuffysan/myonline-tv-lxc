namespace MyOnlineTV.Web;

public sealed record ClientCapabilitiesV2(
    string ClientType,
    bool Hls,
    bool DirectPlay,
    bool Remux,
    bool Transcode,
    bool Dvr,
    bool RemoteControl,
    bool Offline);

public static class ClientCapabilityPolicy
{
    public static string PreferredPlayback(ClientCapabilitiesV2 c) =>
        c.DirectPlay ? "direct" : c.Hls ? "hls" : c.Remux ? "remux" : "transcode";
}
