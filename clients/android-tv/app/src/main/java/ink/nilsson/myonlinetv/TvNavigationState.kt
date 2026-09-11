package ink.nilsson.myonlinetv

data class TvNavigationState(
    val section:String = "home",
    val railIndex:Int = 0,
    val itemIndex:Int = 0,
    val miniGuideVisible:Boolean = false,
    val playerOverlayVisible:Boolean = false,
    val searchOpen:Boolean = false
)

object TvSections {
    val all = listOf("home","live","guide","movies","series","search","dvr","library")
}
