import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var session: AppSession

    var body: some View {
        TabView {
            HomeView().tabItem { Label("Home", systemImage: "house") }
            LiveTVView().tabItem { Label("Live TV", systemImage: "tv") }
            MoviesView().tabItem { Label("Movies", systemImage: "film") }
            SeriesView().tabItem { Label("Series", systemImage: "rectangle.stack") }
            SettingsView().tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}

struct HomeView: View {
    @EnvironmentObject var session: AppSession
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    Text("Welcome, \(session.auth.user ?? "")").font(.largeTitle.bold())
                    if session.providers.isEmpty {
                        ContentUnavailableView("No media sources", systemImage: "rectangle.connected.to.line.below",
                                               description: Text("Add IPTV, Plex or Jellyfin from the web interface."))
                    } else {
                        Text("Your sources").font(.title2.bold())
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 340), spacing: 28)], spacing: 28) {
                            ForEach(session.providers) { p in
                                Button { session.selectedProvider = p } label: {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text(p.name).font(.title2.bold())
                                        Text(p.type.uppercased()).foregroundStyle(.secondary)
                                        if let host = p.host { Text(host).font(.caption).foregroundStyle(.secondary) }
                                    }.frame(maxWidth: .infinity, minHeight: 130, alignment: .leading).padding(24)
                                }
                            }
                        }
                    }
                }.padding(50)
            }.navigationTitle("MyOnline TV")
        }
    }
}
