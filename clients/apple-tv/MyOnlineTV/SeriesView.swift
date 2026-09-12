import SwiftUI

struct SeriesView: View {
    @EnvironmentObject var session: AppSession
    @State private var items: [MediaItem] = []
    @State private var search = ""

    var filtered: [MediaItem] {
        search.isEmpty ? items : items.filter { $0.name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            VStack {
                TextField("Search series", text: $search).padding(.horizontal, 40)
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 230), spacing: 30)], spacing: 35) {
                        ForEach(filtered) { item in
                            NavigationLink(value: item) { PosterCard(item: item) }
                        }
                    }.padding(45)
                }
            }
            .navigationTitle("Series")
            .navigationDestination(for: MediaItem.self) { SeriesDetailView(series: $0) }
            .task { await load() }
        }
    }

    func load() async {
        guard let p = session.selectedProvider, p.type == "xtream" else { items = []; return }
        do { items = try await APIClient.shared.request(server: session.server, path: "/api/series/\(p.id.urlEncoded)/items?categoryId=") }
        catch { session.errorMessage = error.localizedDescription }
    }
}

struct SeriesDetailView: View {
    @EnvironmentObject var session: AppSession
    let series: MediaItem
    @State private var info: SeriesInfo?
    @State private var playerItem: PlayerRoute?

    var body: some View {
        List {
            if let info {
                ForEach((info.episodes ?? [:]).keys.sorted(), id: \.self) { season in
                    Section("Season \(season)") {
                        ForEach(info.episodes?[season] ?? []) { ep in
                            Button {
                                Task { await play(ep) }
                            } label: {
                                VStack(alignment: .leading) {
                                    Text(ep.title ?? "Episode \(ep.episodeNum ?? 0)")
                                    if let d = ep.info?.duration { Text(d).font(.caption).foregroundStyle(.secondary) }
                                }
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(series.name)
        .task { await load() }
        .fullScreenCover(item: $playerItem) { route in PlayerView(route: route) }
    }

    func load() async {
        guard let p = session.selectedProvider else { return }
        do { info = try await APIClient.shared.request(server: session.server, path: "/api/series/\(p.id.urlEncoded)/\(series.id.urlEncoded)") }
        catch { session.errorMessage = error.localizedDescription }
    }

    func play(_ ep: Episode) async {
        guard let p = session.selectedProvider else { return }
        do {
            let ext = ep.containerExtension ?? "mp4"
            let token: PlaybackToken = try await APIClient.shared.request(
                server: session.server,
                path: "/api/series/\(p.id.urlEncoded)/episode/\(ep.id.urlEncoded)/token?ext=\(ext.urlEncoded)",
                method: "POST", body: EmptyBody())
            let path = token.url ?? token.proxyUrl ?? (token.token.map { "/api/proxy/\($0.urlEncoded)" })
            if let url = APIClientURL.absolute(session.server, path) {
                playerItem = PlayerRoute(title: ep.title ?? series.name, url: url)
            }
        } catch { session.errorMessage = error.localizedDescription }
    }
}
