import SwiftUI

struct SetupGuideView: View {
    @EnvironmentObject var session: AppSession
    @State private var status = OnboardingStatus()
    @State private var loaded = false

    var body: some View {
        VStack(spacing: 32) {
            Text("Personal Media Setup").font(.largeTitle.bold())
            Text("Connect your own IPTV, Plex or Jellyfin sources in the MyOnlineTV web interface. Your sources remain private to your account.")
                .multilineTextAlignment(.center).frame(maxWidth: 900)
            if loaded {
                HStack(spacing: 50) {
                    source("IPTV", status.sources?.iptv ?? 0)
                    source("Plex", status.sources?.plex ?? 0)
                    source("Jellyfin", status.sources?.jellyfin ?? 0)
                }
            }
            Text("For detailed source setup, open \(session.server) on your phone or computer. The Apple TV app will automatically use the same account and sources.")
                .multilineTextAlignment(.center).foregroundStyle(.secondary).frame(maxWidth: 850)
            Button("I have finished setup") {
                Task { await session.completeOnboarding() }
            }.buttonStyle(.borderedProminent)
            Button("Refresh") { Task { await load() } }
        }
        .padding(90)
        .task { await load() }
    }

    @ViewBuilder func source(_ name: String, _ count: Int) -> some View {
        VStack(spacing: 8) {
            Text(name).font(.title2.bold())
            Text("\(count) connected").foregroundStyle(.secondary)
        }.frame(width: 220, height: 120)
    }

    func load() async {
        do {
            status = try await APIClient.shared.request(server: session.server, path: "/api/onboarding/status")
            loaded = true
        } catch { session.errorMessage = error.localizedDescription }
    }
}
