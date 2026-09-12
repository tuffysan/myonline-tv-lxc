import SwiftUI
import AVKit

struct LiveTVView: View {
    @EnvironmentObject var session: AppSession
    @State private var channels: [Channel] = []
    @State private var search = ""
    @State private var playerItem: PlayerRoute?

    var filtered: [Channel] {
        search.isEmpty ? channels : channels.filter {
            $0.name.localizedCaseInsensitiveContains(search) || ($0.group ?? "").localizedCaseInsensitiveContains(search)
        }
    }

    var body: some View {
        NavigationStack {
            VStack {
                providerPicker
                if let provider = session.selectedProvider {
                    TextField("Search channels", text: $search).padding(.horizontal, 40)
                    List(filtered) { channel in
                        Button {
                            Task { await play(provider: provider, channel: channel) }
                        } label: {
                            HStack(spacing: 24) {
                                AsyncImage(url: try? APIClientURL.absolute(session.server, channel.logo)) { image in
                                    image.resizable().scaledToFit()
                                } placeholder: { Image(systemName: "tv") }
                                .frame(width: 90, height: 55)
                                VStack(alignment: .leading) {
                                    Text(channel.name).font(.headline)
                                    Text(channel.group ?? "").foregroundStyle(.secondary)
                                }
                            }.padding(.vertical, 8)
                        }
                    }
                } else {
                    ContentUnavailableView("No IPTV source", systemImage: "tv.slash")
                }
            }
            .navigationTitle("Live TV")
            .task { await load() }
            .fullScreenCover(item: $playerItem) { route in PlayerView(route: route) }
        }
    }

    var providerPicker: some View {
        Picker("Source", selection: Binding(
            get: { session.selectedProvider?.id ?? "" },
            set: { id in session.selectedProvider = session.providers.first(where: {$0.id == id}); Task { await load() } })) {
                ForEach(session.providers.filter {$0.type == "xtream" || $0.type == "m3u"}) { p in
                    Text(p.name).tag(p.id)
                }
            }.padding(.horizontal, 40)
    }

    func load() async {
        guard let p = session.selectedProvider else { return }
        do { channels = try await APIClient.shared.request(server: session.server, path: "/api/channels/\(p.id.urlEncoded)") }
        catch { session.errorMessage = error.localizedDescription }
    }

    func play(provider: Provider, channel: Channel) async {
        do {
            let result: LiveStart = try await APIClient.shared.request(
                server: session.server,
                path: "/api/live/start/\(provider.id.urlEncoded)/\(channel.key.urlEncoded)",
                method: "POST", body: EmptyBody())
            if let path = result.playlistUrl,
               let url = try? APIClient.sharedAbsolute(server: session.server, path: path) {
                playerItem = PlayerRoute(title: channel.name, url: url)
            }
        } catch { session.errorMessage = error.localizedDescription }
    }
}
