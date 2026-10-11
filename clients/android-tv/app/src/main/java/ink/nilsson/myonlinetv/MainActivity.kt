package ink.nilsson.myonlinetv

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import ink.nilsson.myonlinetv.databinding.ActivityMainBinding
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val api = MyOnlineApi()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val prefs = getSharedPreferences("myonline", MODE_PRIVATE)
        binding.serverUrl.setText(prefs.getString("server",""))
        binding.username.setText(prefs.getString("username",""))

        binding.connectButton.setOnClickListener {
            val server = binding.serverUrl.text.toString().trim()
            val user = binding.username.text.toString().trim()
            val pass = binding.password.text.toString()
            binding.status.text = "Connecting…"
            thread {
                try {
                    try {
                        api.health(server)
                    } catch (e: Exception) {
                        throw IllegalStateException("Server health check failed: ${e.message}", e)
                    }
                    val login = try {
                        api.login(server, user, pass)
                    } catch (e: Exception) {
                        throw IllegalStateException("Login request failed: ${e.message}", e)
                    }
                    runOnUiThread {
                        prefs.edit().putString("server",server).putString("username",user).apply()
                        binding.password.setText("")
                        binding.status.text = "Connected as ${login.optString("user",user)}"
                        binding.homeActions.visibility = View.VISIBLE
                        binding.liveButton.requestFocus()
                    }
                } catch (e: Exception) {
                    runOnUiThread { binding.status.text = "Connection/login failed: ${e.message}" }
                }
            }
        }

        binding.liveButton.setOnClickListener { open("live") }
        binding.guideButton.setOnClickListener { open("guide") }
        binding.moviesButton.setOnClickListener { open("movies") }
        binding.seriesButton.setOnClickListener { open("series") }
        binding.youtubeButton.setOnClickListener { startActivity(Intent(this, YouTubeActivity::class.java).putExtra("server", binding.serverUrl.text.toString().trim())) }
    }

    private fun open(mode:String) {
        val server=binding.serverUrl.text.toString().trim()
        startActivity(Intent(this,BrowseActivity::class.java)
            .putExtra("server",server)
            .putExtra("mode",mode))
    }
}
