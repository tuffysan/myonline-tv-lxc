package ink.nilsson.myonlinetv

data class DvrEntry(
    val id:String,
    val title:String,
    val start:String="",
    val status:String="",
    val conflict:Boolean=false
)

object DvrTvState {
    fun conflicts(items:List<DvrEntry>)=items.filter { it.conflict }
    fun upcoming(items:List<DvrEntry>)=items.filter { it.status.equals("scheduled",true) }
}
