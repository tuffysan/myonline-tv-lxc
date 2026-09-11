public sealed class TvNavigationV208
{
    public int SelectedIndex { get; private set; }
    public int Move(int delta,int count){ if(count<=0)return SelectedIndex=0; SelectedIndex=(SelectedIndex+delta+count)%count; return SelectedIndex; }
    public static object Capabilities()=>new { dpad=true, tenFoot=true, miniGuide=true, channelZapping=true, minFocusTargetPx=52 };
}