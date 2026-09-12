import SwiftUI

struct ForcedPasswordChangeView: View {
    @EnvironmentObject var session: AppSession
    @State private var current = ""
    @State private var newPassword = ""
    @State private var confirm = ""

    var body: some View {
        VStack(spacing: 24) {
            Text("Choose a new password").font(.largeTitle.bold())
            Text("Your administrator requires you to replace the temporary password before using MyOnlineTV.")
                .multilineTextAlignment(.center).frame(maxWidth: 800)
            SecureField("Temporary password", text: $current).frame(maxWidth: 650)
            SecureField("New password", text: $newPassword).frame(maxWidth: 650)
            SecureField("Confirm new password", text: $confirm).frame(maxWidth: 650)
            Button("Change password") {
                guard newPassword.count >= 10, newPassword == confirm else {
                    session.errorMessage = "Passwords must match and contain at least 10 characters."
                    return
                }
                Task {
                    if await session.changePassword(current: current, new: newPassword) {
                        await session.refreshAuth()
                    }
                }
            }.buttonStyle(.borderedProminent)
        }.padding(80)
    }
}
