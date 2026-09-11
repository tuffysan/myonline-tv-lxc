package ink.nilsson.myonlinetv

object DiscoveryEngine {
    fun rank(query:String, items:List<TvItem>, favoriteIds:Set<String>):List<TvItem> {
        val q=query.trim().lowercase()
        return items.sortedByDescending {
            var score=0
            if(q.isNotBlank() && it.title.lowercase().contains(q)) score+=100
            if(q.isNotBlank() && it.subtitle.lowercase().contains(q)) score+=25
            if(favoriteIds.contains(it.id)) score+=20
            score
        }
    }
}
