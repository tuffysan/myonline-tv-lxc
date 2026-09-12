import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: AppSession

    var body: some View {
        Group {
            if session.auth.authenticated != true {
                LoginView()
            } else if session.auth.requirePasswordChange == true {
                ForcedPasswordChangeView()
            } else if session.auth.onboardingRequired == true {
                SetupGuideView()
            } else {
                MainTabView()
            }
        }
        .alert("MyOnlineTV", isPresented: Binding(
            get: { session.errorMessage != nil },
            set: { if !$0 { session.errorMessage = nil } })) {
                Button("OK") { session.errorMessage = nil }
            } message: { Text(session.errorMessage ?? "") }
    }
}
