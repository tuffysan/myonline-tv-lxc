package ink.nilsson.myonlinetv

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Launches the official YouTube app (or browser fallback) so each viewer can
 * sign in with their own Google account using Google's supported login flow.
 * No API keys, embedded login, or YouTube Data API calls are required.
 */
class YouTubeActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val uri = Uri.parse("https://www.youtube.com/tv")
        val appIntent = Intent(Intent.ACTION_VIEW, uri).apply {
            setPackage("com.google.android.youtube.tv")
        }
        try {
            startActivity(appIntent)
        } catch (_: ActivityNotFoundException) {
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/")))
            } catch (_: ActivityNotFoundException) {
                android.widget.Toast.makeText(this, "Install YouTube or a web browser to continue.", android.widget.Toast.LENGTH_LONG).show()
            }
        }
        finish()
    }
}
