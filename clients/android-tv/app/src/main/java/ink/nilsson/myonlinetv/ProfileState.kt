package ink.nilsson.myonlinetv

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class ProfileState(context:Context) {
    private val prefs=context.getSharedPreferences("myonline-profile",Context.MODE_PRIVATE)
    fun activeProfile():String = prefs.getString("activeProfile","default") ?: "default"
    fun setActiveProfile(id:String)=prefs.edit().putString("activeProfile",id).apply()
    fun favoriteIds():Set<String> = prefs.getStringSet("favorites:${activeProfile()}", emptySet()) ?: emptySet()
    fun toggleFavorite(id:String) {
        val s=favoriteIds().toMutableSet()
        if(!s.add(id)) s.remove(id)
        prefs.edit().putStringSet("favorites:${activeProfile()}",s).apply()
    }
    fun continueWatching():JSONArray =
        JSONArray(prefs.getString("continue:${activeProfile()}","[]") ?: "[]")
    fun saveContinueWatching(items:JSONArray)=
        prefs.edit().putString("continue:${activeProfile()}",items.toString()).apply()
}
