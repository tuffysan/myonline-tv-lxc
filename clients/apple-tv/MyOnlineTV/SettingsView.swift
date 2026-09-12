import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var session: AppSession
    @State private var server = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    LabeledContent("User", value: session.auth.user ?? "")
                    LabeledContent("Role", value: session.auth.role ?? "")
                }
                Section("Server") {
                    TextField("MyOnlineTV server", text: $server)
                    Button("Save server") { session.saveServer(server) }
                }
                Section("Media sources") {
                    Picker("Active IPTV source", selection: Binding(
                        get: { session.selectedProvider?.id ?? "" },
                        set: { id in session.selectedProvider = session.providers.first(where: {$0.id == id}) })) {
                            ForEach(session.providers) { p in Text(p.name).tag(p.id) }
                        }
                    Button("Refresh sources") { Task { await session.loadProviders() } }
                }
                Section {
                    Button("Sign out", role: .destructive) { Task { await session.logout() } }
                }
            }
            .navigationTitle("Settings")
            .onAppear { server = session.server }
        }
    }
}
