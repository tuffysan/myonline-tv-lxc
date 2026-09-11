public static class MultiViewPolicyV217
{
    public sealed record Layout(int Streams,int Columns,int Rows);
    public static Layout Plan(int requested,int cpuCores,bool hardwareAcceleration){
      var max=hardwareAcceleration?4:Math.Max(1,Math.Min(2,cpuCores/2));
      var n=Math.Clamp(requested,1,max); return n switch{1=>new(1,1,1),2=>new(2,2,1),3=>new(3,2,2),_=>new(4,2,2)};
    }
    public static bool PipAllowed(bool browserPip,bool singlePlayback)=>browserPip&&singlePlayback;
}