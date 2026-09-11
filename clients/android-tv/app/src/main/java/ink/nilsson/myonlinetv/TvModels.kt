package ink.nilsson.myonlinetv

data class TvProvider(val id:String,val name:String,val type:String)
data class TvItem(
    val id:String,
    val title:String,
    val subtitle:String="",
    val image:String="",
    val key:String="",
    val extension:String="",
    val kind:String=""
)
