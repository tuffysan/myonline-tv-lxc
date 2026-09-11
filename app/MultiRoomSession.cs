namespace MyOnlineTV.Web;
public sealed record MultiRoomSession(string Id,string UserId,string MediaId,long PositionMs,IReadOnlyList<string> DeviceIds,bool Playing);
public sealed class MultiRoomCoordinator {
 public MultiRoomSession Move(MultiRoomSession s,string deviceId) =>
   s with { DeviceIds = new[]{deviceId} };
 public MultiRoomSession Join(MultiRoomSession s,string deviceId) =>
   s with { DeviceIds = s.DeviceIds.Append(deviceId).Distinct().ToArray() };
}
