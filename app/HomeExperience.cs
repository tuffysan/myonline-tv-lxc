namespace MyOnlineTV.Web;
public sealed record HomeRail(string Id,string Title,IReadOnlyList<string> ItemIds,int Priority=0);
public sealed record ViewerHome(IReadOnlyList<HomeRail> Rails,DateTimeOffset GeneratedAt);
public sealed class HomeComposer {
 public ViewerHome Compose(IEnumerable<HomeRail> rails) => new(
   rails.Where(x=>x.ItemIds.Count>0).OrderByDescending(x=>x.Priority).ToArray(), DateTimeOffset.UtcNow);
}
