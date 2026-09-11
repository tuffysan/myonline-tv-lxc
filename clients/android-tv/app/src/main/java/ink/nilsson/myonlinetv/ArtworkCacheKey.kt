package ink.nilsson.myonlinetv

object ArtworkCacheKey {
    fun build(sourceId:String, mediaId:String, variant:String="poster"):String =
        "$sourceId:$mediaId:$variant"
}
