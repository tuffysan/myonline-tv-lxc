package ink.nilsson.myonlinetv
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
class MemoryCookieJar:CookieJar{private val cookies=mutableMapOf<String,MutableList<Cookie>>();override fun saveFromResponse(url:HttpUrl,incoming:List<Cookie>){cookies[url.host]=incoming.toMutableList()};override fun loadForRequest(url:HttpUrl):List<Cookie> = cookies[url.host]?.filter{it.expiresAt>System.currentTimeMillis()}?: emptyList()}
