import SwiftUI

struct LoginView: View {
    @EnvironmentObject var session: AppSession
    @State private var server = ""
    @State private var username = ""
    @State private var password = ""

    var body: some View {
        VStack(spacing: 28) {
            Image("AppLogo").resizable().scaledToFit().frame(width: 180, height: 180)
            Text("MyOnline TV").font(.largeTitle.bold())
            TextField("Server", text: $server)
                .textContentType(.URL)
                .frame(maxWidth: 720)
            TextField("Username", text: $username)
                .textContentType(.username)
                .frame(maxWidth: 720)
            SecureField("Password", text: $password)
                .textContentType(.password)
                .frame(maxWidth: 720)
            Button("Sign in") {
                session.saveServer(server)
                Task { await session.login(username: username, password: password) }
            }
            .buttonStyle(.borderedProminent)
            .disabled(username.isEmpty || password.isEmpty || session.isBusy)
        }
        .padding(80)
        .onAppear { server = session.server }
    }
}
