import SwiftUI

@main
struct MyOnlineTVApp: App {
    @StateObject private var session = AppSession()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .task { await session.bootstrap() }
        }
    }
}
