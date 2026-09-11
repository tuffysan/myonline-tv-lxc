package ink.nilsson.myonlinetv

data class ClientCapabilities(
    val apiVersion:Int=1,
    val features:Set<String> = setOf(
        "live","epg","movies","series","dvr","library",
        "profiles","search","playback","remote-control","multi-room"
    )
) {
    fun supports(name:String)=features.contains(name)
}
