import Foundation
import SwiftUI

@MainActor
final class AppSession: ObservableObject {
    @Published var server = UserDefaults.standard.string(forKey: "server") ?? "https://tv.nilsson.ink"
    @Published var auth = AuthStatus()
    @Published var providers: [Provider] = []
    @Published var selectedProvider: Provider?
    @Published var errorMessage: String?
    @Published var isBusy = false

    func bootstrap() async {
        do {
            auth = try await APIClient.shared.request(server: server, path: "/api/auth/status")
            if auth.authenticated == true {
                if auth.requirePasswordChange != true && auth.onboardingRequired != true {
                    await loadProviders()
                }
            }
        } catch {
            auth = AuthStatus(configured: true, authenticated: false)
            errorMessage = error.localizedDescription
        }
    }

    func saveServer(_ value: String) {
        server = value.trimmingCharacters(in: .whitespacesAndNewlines)
        UserDefaults.standard.set(server, forKey: "server")
    }

    func login(username: String, password: String) async {
        isBusy = true; defer { isBusy = false }
        do {
            let result: LoginResponse = try await APIClient.shared.request(
                server: server, path: "/api/auth/login", method: "POST",
                body: LoginRequest(username: username, password: password))
            auth = AuthStatus(
                configured: true, authenticated: true, user: result.user, role: result.role,
                requirePasswordChange: result.requirePasswordChange,
                onboardingRequired: result.onboardingRequired)
            if auth.requirePasswordChange != true && auth.onboardingRequired != true {
                await loadProviders()
            }
        } catch { errorMessage = error.localizedDescription }
    }

    func refreshAuth() async {
        do { auth = try await APIClient.shared.request(server: server, path: "/api/auth/status") }
        catch { errorMessage = error.localizedDescription }
    }

    func changePassword(current: String, new: String) async -> Bool {
        do {
            let _: EmptyResponse = try await APIClient.shared.request(
                server: server, path: "/api/auth/change-password", method: "POST",
                body: ChangePasswordRequest(currentPassword: current, newPassword: new))
            await refreshAuth()
            return true
        } catch { errorMessage = error.localizedDescription; return false }
    }

    func loadProviders() async {
        do {
            providers = try await APIClient.shared.request(server: server, path: "/api/providers")
            if selectedProvider == nil { selectedProvider = providers.first }
        } catch { errorMessage = error.localizedDescription }
    }

    func completeOnboarding() async {
        do {
            let _: EmptyResponse = try await APIClient.shared.request(server: server, path: "/api/onboarding/complete", method: "POST")
            await refreshAuth()
            await loadProviders()
        } catch { errorMessage = error.localizedDescription }
    }

    func logout() async {
        do {
            let _: EmptyResponse = try await APIClient.shared.request(server: server, path: "/api/auth/logout", method: "POST")
        } catch {}
        auth = AuthStatus(configured: true, authenticated: false)
        providers = []
        selectedProvider = nil
    }
}
