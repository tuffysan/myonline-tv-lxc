package ink.nilsson.myonlinetv

data class TvRail(val id:String, val title:String, val items:List<TvItem>)
data class MiniGuideState(
    val channelId:String="",
    val channelName:String="",
    val nowTitle:String="",
    val nextTitle:String="",
    val visible:Boolean=false
)

object TvHomeComposer {
    fun rails(
        continueWatching:List<TvItem>,
        favorites:List<TvItem>,
        live:List<TvItem>,
        movies:List<TvItem>,
        series:List<TvItem>
    ):List<TvRail> = buildList {
        if (continueWatching.isNotEmpty()) add(TvRail("continue","Continue Watching",continueWatching))
        if (favorites.isNotEmpty()) add(TvRail("favorites","Favorites",favorites))
        if (live.isNotEmpty()) add(TvRail("live","Live TV",live))
        if (movies.isNotEmpty()) add(TvRail("movies","Movies",movies))
        if (series.isNotEmpty()) add(TvRail("series","Series",series))
    }
}
