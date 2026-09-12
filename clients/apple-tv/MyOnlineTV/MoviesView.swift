import SwiftUI

struct MoviesView: View {
    @EnvironmentObject var session: AppSession
    @State private var items: [MediaItem] = []
    @State private var search = ""
    @State private var playerItem: PlayerRoute?

    var filtered: [MediaItem] {
        search.isEmpty ? items : items.filter { $0.name.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        NavigationStack {
            VStack {
                TextField("Search movies", text: $search).padding(.horizontal, 40)
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 230), spacing: 30)], spacing: 35) {
                        ForEach(filtered) { item in
                            Button { Task { await play(item) } } label: {
                                PosterCard(item: item)
                            }
                        }
                    }.padding(45)
                }
            }
            .navigationTitle("Movies")
            .task { await load() }
            .fullScreenCover(item: $playerItem) { route in PlayerView(route: route) }
        }
    }

    func load() async {
        guard let p = session.selectedProvider, p.type == "xtream" else { items = []; return }
        do { items = try await APIClient.shared.request(server: session.server, path: "/api/vod/\(p.id.urlEncoded)/items?categoryId=") }
        catch { session.errorMessage = error.localizedDescription }
    }

    func play(_ item: MediaItem) async {
        guard let p = session.selectedProvider else { return }
        do {
            let token: PlaybackToken = try await APIClient.shared.request(
                server: session.server, path: "/api/vod/\(p.id.urlEncoded)/\(item.id.urlEncoded)/token",
                method: "POST", body: EmptyBody())
            let path = token.url ?? token.proxyUrl ?? (token.token.map { "/api/proxy/\($0.urlEncoded)" })
            if let url = APIClientURL.absolute(session.server, path) {
                playerItem = PlayerRoute(title: item.name, url: url)
            }
        } catch { session.errorMessage = error.localizedDescription }
    }
}

struct PosterCard: View {
    let item: MediaItem
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            AsyncImage(url: URL(string: item.poster ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                ZStack { Rectangle().opacity(0.15); Image(systemName: "film").font(.largeTitle) }
            }
            .frame(height: 330).clipped().cornerRadius(14)
            Text(item.name).font(.headline).lineLimit(2)
            HStack {
                if let year = item.year { Text(year) }
                if let rating = item.rating, !rating.isEmpty { Text("★ \(rating)") }
            }.font(.caption).foregroundStyle(.secondary)
        }.frame(width: 230)
    }
}
