package ink.nilsson.myonlinetv

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import ink.nilsson.myonlinetv.databinding.ActivityBrowseBinding
import kotlin.concurrent.thread

class SeriesActivity:AppCompatActivity() {
    private lateinit var b:ActivityBrowseBinding
    private val api=MyOnlineApi()
    private val adapter=TvItemAdapter(mutableListOf()) { play(it) }
    private lateinit var server:String
    private lateinit var providerId:String

    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        b=ActivityBrowseBinding.inflate(layoutInflater)
        setContentView(b.root)
        server=intent.getStringExtra("server") ?: return finish()
        providerId=intent.getStringExtra("providerId") ?: return finish()
        val seriesId=intent.getStringExtra("seriesId") ?: return finish()
        b.title.text=intent.getStringExtra("title") ?: "Series"
        b.list.layoutManager=LinearLayoutManager(this)
        b.list.adapter=adapter
        thread {
            try {
                val info=api.seriesInfo(server,providerId,seriesId)
                val eps=info.optJSONArray("episodes")
                val rows=buildList {
                    if(eps!=null) for(i in 0 until eps.length()) {
                        val e=eps.getJSONObject(i)
                        add(TvItem(
                            id=e.optString("id"),
                            title=e.optString("title","Episode ${e.optString("episode")}"),
                            subtitle="Season ${e.optString("season")} · Episode ${e.optString("episode")}",
                            extension=e.optString("extension","mp4"),
                            kind="episode"
                        ))
                    }
                }
                runOnUiThread {
                    b.status.text="${rows.size} episodes"
                    adapter.replace(rows)
                    if(rows.isNotEmpty()) b.list.requestFocus()
                }
            } catch(e:Exception) {
                runOnUiThread { b.status.text="Error: ${e.message}" }
            }
        }
    }

    private fun play(item:TvItem) {
        b.status.text="Opening ${item.title}…"
        thread {
            try {
                val token=api.episodeToken(server,providerId,item.id,item.extension).optString("playToken")
                if(token.isBlank()) throw IllegalStateException("No playback token")
                runOnUiThread {
                    startActivity(Intent(this,PlayerActivity::class.java)
                        .putExtra("title",item.title)
                        .putExtra("url",api.proxyUrl(server,token)))
                }
            } catch(e:Exception) { runOnUiThread{b.status.text="Playback error: ${e.message}"} }
        }
    }
}
