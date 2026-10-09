package ink.nilsson.myonlinetv

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity

/**
 * TV-friendly embedded YouTube website.
 * Privacy filtering deliberately excludes YouTube video/ad delivery hosts:
 * blocking those would break playback and cannot reliably remove video ads.
 */
class YouTubeActivity : AppCompatActivity() {
    private lateinit var root: FrameLayout
    private lateinit var browser: WebView
    private var fullScreenView: View? = null
    private var fullScreenCallback: WebChromeClient.CustomViewCallback? = null
    private val blockedHosts = setOf(
        "google-analytics.com", "www.google-analytics.com",
        "doubleclick.net", "stats.g.doubleclick.net",
        "connect.facebook.net", "facebook.com",
        "analytics.twitter.com"
    )

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        root = FrameLayout(this)
        browser = WebView(this)
        root.addView(browser, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        browser.settings.javaScriptEnabled = true
        browser.settings.domStorageEnabled = true
        browser.settings.mediaPlaybackRequiresUserGesture = false
        browser.settings.useWideViewPort = true
        browser.settings.loadWithOverviewMode = true
        browser.settings.setSupportZoom(false)
        browser.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                val uri = request?.url ?: return null
                if (uri.scheme != "https" && uri.scheme != "http") return null
                val host = uri.host?.lowercase() ?: return null
                val blocked = blockedHosts.any { host == it || host.endsWith(".$it") }
                return if (blocked) WebResourceResponse("text/plain", "UTF-8", 204,
                    "No Content", emptyMap(), java.io.ByteArrayInputStream(ByteArray(0))) else null
            }
        }
        browser.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(view: View?, callback: CustomViewCallback?) {
                if (view == null || fullScreenView != null) { callback?.onCustomViewHidden(); return }
                fullScreenView = view
                fullScreenCallback = callback
                browser.visibility = View.GONE
                root.addView(view, FrameLayout.LayoutParams(-1, -1))
            }
            override fun onHideCustomView() {
                fullScreenView?.let { root.removeView(it) }
                fullScreenView = null
                browser.visibility = View.VISIBLE
                fullScreenCallback?.onCustomViewHidden()
                fullScreenCallback = null
            }
        }
        browser.isFocusable = true
        browser.isFocusableInTouchMode = true
        browser.requestFocus()
        browser.loadUrl("https://www.youtube.com/tv")
    }

    @Deprecated("Use onBackPressedDispatcher")
    override fun onBackPressed() {
        when {
            fullScreenView != null -> browser.webChromeClient.onHideCustomView()
            browser.canGoBack() -> browser.goBack()
            else -> super.onBackPressed()
        }
    }

    override fun onDestroy() {
        fullScreenView?.let { root.removeView(it) }
        browser.stopLoading()
        browser.destroy()
        super.onDestroy()
    }
}
