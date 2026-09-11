public static class AndroidTvPolicyV213
{
    public static object ProductContract()=>new {
      login=true, home=true, live=true, guide=true, movies=true, series=true, search=true,
      continueWatching=true, favourites=true, media3=true, dpad=true,
      livePlaybackRule="poll /api/live/status/{sessionId} until ready before HLS"
    };
}