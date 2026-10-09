package ink.nilsson.myonlinetv

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

/**
 * Prefer a user-installed, TV-optimized YouTube client with ad filtering.
 * Never downloads or installs third-party APKs on the user's behalf.
 * Fallback to official YouTube app, then any available browser.
 */
class YouTubeActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val youtube = Uri.parse("https://www.youtube.com/tv")
        val candidates = listOf(
            "com.teamsmart.videomanager.tv", // SmartTube legacy package
            "app.smarttube",                  // SmartTube current package
            "com.google.android.youtube.tv"  // Official YouTube fallback
        )
        var launched = false
        for (packageName in candidates) {
            try {
                startActivity(Intent(Intent.ACTION_VIEW, youtube).apply {
                    setPackage(packageName)
                    addCategory(Intent.CATEGORY_BROWSABLE)
                })
                launched = true
                break
            } catch (_: ActivityNotFoundException) {
                // Try next installed application.
            } catch (_: SecurityException) {
                // This package cannot accept external launches.
            }
        }
        if (!launched) {
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/")))
                launched = true
            } catch (_: ActivityNotFoundException) {
                // No browser installed.
            }
        }
        if (!launched) {
            android.widget.Toast.makeText(
                this, "Install SmartTube, YouTube or a browser to continue.",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
        finish()
    }
}
