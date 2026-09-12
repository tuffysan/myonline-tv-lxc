import SwiftUI
import AVKit

struct PlayerRoute: Identifiable {
    let id = UUID()
    let title: String
    let url: URL
}

struct PlayerView: View {
    let route: PlayerRoute
    @State private var player = AVPlayer()

    var body: some View {
        VideoPlayer(player: player)
            .ignoresSafeArea()
            .onAppear {
                player.replaceCurrentItem(with: AVPlayerItem(url: route.url))
                player.play()
            }
            .onDisappear { player.pause() }
    }
}
