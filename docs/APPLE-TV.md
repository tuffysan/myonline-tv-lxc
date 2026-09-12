# MyOnlineTV for Apple TV

Native tvOS client built with SwiftUI and AVPlayer.

## Included

- MyOnlineTV account login
- forced temporary-password change
- first-login Personal Media Setup handoff
- per-user media sources from the existing MyOnlineTV backend
- Live TV
- Movies
- Series / seasons / episodes
- native AVPlayer playback
- Apple TV focus/remote navigation through native SwiftUI controls
- remembered server address
- sign out and source selection

Hidden IPTV Live TV groups/channels and hidden Movie/Series catalogue items are already filtered by the server API, so the Apple TV client follows the same visibility settings as the web application.

## Create the Xcode project

On a Mac:

```bash
cd clients/apple-tv
chmod +x CREATE-XCODE-PROJECT.command
./CREATE-XCODE-PROJECT.command
```

The script uses XcodeGen. If Homebrew is installed it can install XcodeGen automatically.

## Install on Apple TV

1. Install current Xcode on the Mac.
2. On Apple TV, enable Developer Mode when tvOS requests it.
3. Put Mac and Apple TV on the same network.
4. In Xcode choose **Window > Devices and Simulators** and pair the Apple TV.
5. Open `MyOnlineTV.xcodeproj`.
6. Select the **MyOnlineTV** target.
7. In **Signing & Capabilities**, select your Apple ID development team.
8. Choose the paired Apple TV as the run destination.
9. Press **Run**.

For personal development installation, Xcode handles signing. Distribution through TestFlight/App Store requires an Apple Developer Program membership.

Default server: `https://tv.nilsson.ink`. It can be changed on the login/settings screen.
