plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
 namespace = "ink.nilsson.myonlinetv"
 compileSdk = 35
 defaultConfig { applicationId = "ink.nilsson.myonlinetv"; minSdk = 23; targetSdk = 35; versionCode = 620; versionName = "6.2.0" }
 buildFeatures { viewBinding = true; buildConfig = true }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}
dependencies {
 implementation("androidx.core:core-ktx:1.15.0")
 implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.recyclerview:recyclerview:1.4.0")
 implementation("androidx.leanback:leanback:1.2.0")
 implementation("androidx.media3:media3-exoplayer:1.6.0")
 implementation("androidx.media3:media3-exoplayer-hls:1.6.0")
 implementation("androidx.media3:media3-ui:1.6.0")
 implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
