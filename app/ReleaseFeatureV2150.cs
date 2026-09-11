public sealed class MultiRoomCoordinatorV215
{
    public sealed record Session(string MediaId,string OwnerDevice,string Room,DateTimeOffset Updated);
    private readonly Dictionary<string,Session> sessions=new();
    public Session Handoff(string id,string media,string device,string room){var s=new Session(media,device,room,DateTimeOffset.UtcNow);sessions[id]=s;return s;}
    public IReadOnlyCollection<Session> Active()=>sessions.Values.ToList();
}