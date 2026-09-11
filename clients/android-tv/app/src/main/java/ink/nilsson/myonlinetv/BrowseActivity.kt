package ink.nilsson.myonlinetv

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import ink.nilsson.myonlinetv.databinding.ActivityBrowseBinding
import org.json.JSONArray
import kotlin.concurrent.thread

class BrowseActivity: AppCompatActivity() {
    private lateinit var b: ActivityBrowseBinding
    private val api=MyOnlineApi()
    private val adapter=TvItemAdapter(mutableListOf()) { openItem(it) }
    private lateinit var server:String
    private lateinit var mode:String
    private var provider:TvProvider?=null

    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        b=ActivityBrowseBinding.inflate(layoutInflater)
        setContentView(b.root)
        server=intent.getStringExtra("server") ?: finishAndReturn()
        mode=intent.getStringExtra("mode") ?: "live"
        b.list.layoutManager=LinearLayoutManager(this)
        b.list.adapter=adapter
        b.title.text=mode.replaceFirstChar { it.uppercase() }
        b.status.text="Loading…"
        load()
    }

    private fun finishAndReturn():String { finish(); return "" }

    private fun load() {
        thread {
            try {
                val providers=api.providers(server)
                val chosen=chooseProvider(providers)
                    ?: throw IllegalStateException("No compatible IPTV provider configured")
                provider=chosen
                val rows=when(mode) {
                    "live" -> parseChannels(api.channels(server,chosen.id))
                    "guide" -> parseGuide(api.epg(server,chosen.id))
                    "movies" -> parseMovies(api.movies(server,chosen.id))
                    "series" -> parseSeries(api.series(server,chosen.id))
                    else -> emptyList()
                }
                runOnUiThread {
                    b.status.text="${chosen.name} · ${rows.size} items"
                    adapter.replace(rows)
                    if(rows.isNotEmpty()) b.list.requestFocus()
                }
            } catch(e:Exception) {
                runOnUiThread { b.status.text="Error: ${e.message}" }
            }
        }
    }

    private fun chooseProvider(a:JSONArray):TvProvider? {
        for(i in 0 until a.length()) {
            val o=a.getJSONObject(i)
            if(o.optString("type").equals("xtream",true))
                return TvProvider(o.optString("id"),o.optString("name"),o.optString("type"))
        }
        if(a.length()>0) {
            val o=a.getJSONObject(0)
            return TvProvider(o.optString("id"),o.optString("name"),o.optString("type"))
        }
        return null
    }

    private fun parseChannels(a:JSONArray)=buildList {
        for(i in 0 until a.length()) {
            val o=a.getJSONObject(i)
            add(TvItem(
                id=o.optString("id"),
                key=o.optString("key"),
                title=o.optString("name"),
                subtitle=listOf(o.optString("number"),o.optString("group")).filter{it.isNotBlank()}.joinToString(" · "),
                image=o.optString("logo"),
                kind="live"
            ))
        }
    }

    private fun parseGuide(a:JSONArray)=buildList {
        for(i in 0 until a.length()) {
            val o=a.getJSONObject(i)
            add(TvItem(
                id="$i",
                title=o.optString("title","Programme"),
                subtitle=listOf(o.optString("channel"),o.optString("category")).filter{it.isNotBlank()}.joinToString(" · "),
                key=o.optString("channel"),
                kind="guide"
            ))
        }
    }

    private fun parseMovies(a:JSONArray)=buildList {
        for(i in 0 until a.length()) {
            val o=a.getJSONObject(i)
            add(TvItem(
                id=o.optString("id"),
                title=o.optString("name"),
                subtitle=listOf(o.optString("year"),o.optString("genre"),o.optString("rating")).filter{it.isNotBlank()}.joinToString(" · "),
                image=o.optString("poster"),
                kind="movie"
            ))
        }
    }

    private fun parseSeries(a:JSONArray)=buildList {
        for(i in 0 until a.length()) {
            val o=a.getJSONObject(i)
            add(TvItem(
                id=o.optString("id"),
                title=o.optString("name"),
                subtitle=listOf(o.optString("year"),o.optString("genre"),o.optString("rating")).filter{it.isNotBlank()}.joinToString(" · "),
                image=o.optString("poster"),
                kind="series"
            ))
        }
    }

    private fun openItem(item:TvItem) {
        val p=provider ?: return
        when(item.kind) {
            "live" -> startLive(p,item)
            "movie" -> startMovie(p,item)
            "series" -> openSeries(p,item)
        }
    }

    private fun startLive(p:TvProvider,item:TvItem) {
        b.status.text="Starting ${item.title}…"
        thread {
            try {
                val start=api.startLive(server,p.id,item.key)
                val statusUrl=start.optString("statusUrl")
                var playback=start.optString("playbackUrl")
                repeat(20) {
                    if(playback.isNotBlank()) return@repeat
                    Thread.sleep(500)
                    val status=api.liveStatus(server,statusUrl)
                    if(status.optString("status")=="ready") playback=status.optString("playbackUrl")
                }
                if(playback.isBlank()) throw IllegalStateException("Live stream did not become ready")
                launchPlayer(item.title,api.absolute(server,playback))
            } catch(e:Exception) { runOnUiThread{b.status.text="Playback error: ${e.message}"} }
        }
    }

    private fun startMovie(p:TvProvider,item:TvItem) {
        b.status.text="Opening ${item.title}…"
        thread {
            try {
                val token=api.movieToken(server,p.id,item.id).optString("playToken")
                if(token.isBlank()) throw IllegalStateException("No playback token")
                launchPlayer(item.title,api.proxyUrl(server,token))
            } catch(e:Exception) { runOnUiThread{b.status.text="Playback error: ${e.message}"} }
        }
    }

    private fun openSeries(p:TvProvider,item:TvItem) {
        val i=Intent(this,SeriesActivity::class.java)
            .putExtra("server",server)
            .putExtra("providerId",p.id)
            .putExtra("seriesId",item.id)
            .putExtra("title",item.title)
        startActivity(i)
    }

    private fun launchPlayer(title:String,url:String) {
        runOnUiThread {
            startActivity(Intent(this,PlayerActivity::class.java)
                .putExtra("title",title)
                .putExtra("url",url))
        }
    }
}
