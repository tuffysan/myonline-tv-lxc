package ink.nilsson.myonlinetv

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder

class MyOnlineApi {
    private val jsonType = "application/json; charset=utf-8".toMediaType()
    private val client = OkHttpClient.Builder()
        .cookieJar(MemoryCookieJar())
        .followRedirects(true)
        .build()

    fun health(server: String): JSONObject {
        return getObject(server, "/api/appliance/health")
    }

    fun login(server: String, username: String, password: String): JSONObject {
        val payload = JSONObject()
            .put("username", username)
            .put("password", password)
            .toString()
            .toRequestBody(jsonType)
        return executeObject(Request.Builder()
            .url(server.trimEnd('/') + "/api/auth/login")
            .post(payload)
            .build())
    }

    fun providers(server: String): JSONArray = getArray(server, "/api/providers")
    fun channels(server: String, providerId: String): JSONArray =
        getArray(server, "/api/channels/${enc(providerId)}")
    fun epg(server: String, providerId: String): JSONArray =
        getArray(server, "/api/epg/${enc(providerId)}?hours=8")
    fun movies(server: String, providerId: String): JSONArray =
        getArray(server, "/api/vod/${enc(providerId)}/items?categoryId=")
    fun series(server: String, providerId: String): JSONArray =
        getArray(server, "/api/series/${enc(providerId)}/items?categoryId=")
    fun seriesInfo(server: String, providerId: String, seriesId: String): JSONObject =
        getObject(server, "/api/series/${enc(providerId)}/${enc(seriesId)}")

    fun startLive(server: String, providerId: String, channelKey: String): JSONObject =
        postObject(server, "/api/live/start/${enc(providerId)}/${enc(channelKey)}", JSONObject())

    fun liveStatus(server: String, statusUrl: String): JSONObject =
        getObject(server, statusUrl)

    fun movieToken(server: String, providerId: String, streamId: String): JSONObject =
        postObject(server, "/api/vod/${enc(providerId)}/${enc(streamId)}/token", JSONObject())

    fun episodeToken(server: String, providerId: String, episodeId: String, ext: String): JSONObject =
        postObject(server, "/api/series/${enc(providerId)}/episode/${enc(episodeId)}/token?ext=${enc(ext)}", JSONObject())

    fun absolute(server: String, path: String): String =
        if (path.startsWith("http://") || path.startsWith("https://")) path
        else server.trimEnd('/') + if (path.startsWith("/")) path else "/$path"

    fun proxyUrl(server: String, token: String): String =
        absolute(server, "/api/proxy/${enc(token)}")

    private fun getArray(server: String, path: String): JSONArray {
        val req = Request.Builder().url(absolute(server,path)).get().build()
        client.newCall(req).execute().use { r ->
            if (!r.isSuccessful) throw IllegalStateException("HTTP ${r.code}")
            return JSONArray(r.body?.string().orEmpty().ifBlank { "[]" })
        }
    }

    private fun getObject(server: String, path: String): JSONObject {
        val req = Request.Builder().url(absolute(server,path)).get().build()
        return executeObject(req)
    }

    private fun postObject(server: String, path: String, payload: JSONObject): JSONObject {
        val req = Request.Builder()
            .url(absolute(server,path))
            .post(payload.toString().toRequestBody(jsonType))
            .build()
        return executeObject(req)
    }

    private fun executeObject(req: Request): JSONObject {
        client.newCall(req).execute().use { r ->
            if (!r.isSuccessful) throw IllegalStateException("HTTP ${r.code}")
            return JSONObject(r.body?.string().orEmpty().ifBlank { "{}" })
        }
    }

    private fun enc(v: String): String = URLEncoder.encode(v, Charsets.UTF_8.name())
}
