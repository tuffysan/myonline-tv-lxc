public static class HomeComposerV210
{
    public sealed record Rail(string Id,string Title,int Priority,int MaxItems);
    public static IReadOnlyList<Rail> Default()=>new[]{
      new Rail("continue","Continue watching",100,16),new Rail("live-now","On TV now",90,12),
      new Rail("next","Next episodes",80,12),new Rail("recordings","Recordings",70,12),
      new Rail("favourites","Favourites",60,12),new Rail("local-recommendations","For you",50,16)
    };
}