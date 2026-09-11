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
                    api.health(server)
                    val login=api.login(server,user,pass)
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
    }

    private fun open(mode:String) {
        val server=binding.serverUrl.text.toString().trim()
        startActivity(Intent(this,BrowseActivity::class.java)
            .putExtra("server",server)
            .putExtra("mode",mode))
    }
}
