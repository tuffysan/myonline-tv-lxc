package ink.nilsson.myonlinetv

data class TvUiState(
    val focusedSection:String="home",
    val selectedCategory:String="All",
    val miniGuideVisible:Boolean=false,
    val channelNumberBuffer:String=""
)

object TvExperience {
    private val recentChannels=ArrayDeque<TvItem>()
    fun rememberChannel(item:TvItem) {
        recentChannels.removeAll { it.id==item.id }
        recentChannels.addFirst(item)
        while(recentChannels.size>12) recentChannels.removeLast()
    }
    fun recent():List<TvItem> = recentChannels.toList()
}
