import Foundation

enum APIError: LocalizedError {
    case badServer
    case http(Int, String)
    case invalidResponse

    var errorDescription: String? {
        switch self {
        case .badServer: return "Invalid MyOnlineTV server address."
        case .http(let code, let message): return "HTTP \(code): \(message)"
        case .invalidResponse: return "The server returned an invalid response."
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    private let decoder: JSONDecoder
    private let session: URLSession

    init() {
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let config = URLSessionConfiguration.default
        config.httpCookieStorage = .shared
        config.httpShouldSetCookies = true
        config.requestCachePolicy = .reloadRevalidatingCacheData
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 120
        session = URLSession(configuration: config)
    }

    func absolute(server: String, path: String) throws -> URL {
        let s = server.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let base = URL(string: s), base.scheme == "https" || base.scheme == "http" else {
            throw APIError.badServer
        }
        if let direct = URL(string: path), direct.scheme != nil { return direct }
        return URL(string: s + (path.hasPrefix("/") ? path : "/" + path))!
    }

    func request<T: Decodable>(
        server: String,
        path: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        let url = try absolute(server: server, path: path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("MyOnlineTV-AppleTV/34.2.0", forHTTPHeaderField: "User-Agent")
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }
        let (data, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let text = String(data: data, encoding: .utf8) ?? ""
            throw APIError.http(http.statusCode, text.isEmpty ? "Request failed" : text)
        }
        if T.self == EmptyResponse.self { return EmptyResponse() as! T }
        return try decoder.decode(T.self, from: data)
    }

    func getData(server: String, path: String) async throws -> Data {
        let url = try absolute(server: server, path: path)
        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw APIError.invalidResponse
        }
        return data
    }
}

struct EmptyResponse: Codable {}

private struct AnyEncodable: Encodable {
    private let encodeBlock: (Encoder) throws -> Void
    init(_ value: Encodable) { encodeBlock = value.encode }
    func encode(to encoder: Encoder) throws { try encodeBlock(encoder) }
}

struct LoginRequest: Codable { let username: String; let password: String }
struct ChangePasswordRequest: Codable { let currentPassword: String; let newPassword: String }
