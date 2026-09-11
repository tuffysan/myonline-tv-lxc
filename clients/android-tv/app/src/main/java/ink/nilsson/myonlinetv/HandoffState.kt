package ink.nilsson.myonlinetv

data class PlaybackHandoff(
    val mediaId:String,
    val kind:String,
    val title:String,
    val positionMs:Long=0,
    val sourceDeviceId:String="",
    val targetDeviceId:String=""
)

object MultiRoom {
    fun canResume(h:PlaybackHandoff)=h.mediaId.isNotBlank() && h.positionMs>=0
}
