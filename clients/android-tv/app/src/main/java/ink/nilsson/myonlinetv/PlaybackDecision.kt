package ink.nilsson.myonlinetv

data class PlaybackDecision(
    val mode:String,
    val url:String,
    val resumePositionMs:Long = 0,
    val sessionId:String? = null,
    val expiresAt:String? = null
)
