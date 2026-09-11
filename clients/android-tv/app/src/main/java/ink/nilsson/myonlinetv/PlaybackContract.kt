package ink.nilsson.myonlinetv
enum class PlaybackMode { DIRECT, HLS, REMUX, TRANSCODE }
data class PlaybackResult(val mode:PlaybackMode,val url:String,val expires:String?=null,val resumePositionMs:Long=0,val sessionId:String?=null)
