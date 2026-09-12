import Foundation

struct EmptyBody: Codable {}

enum APIClientURL {
    static func absolute(_ server: String, _ path: String?) -> URL? {
        guard let path, !path.isEmpty else { return nil }
        if let u = URL(string: path), u.scheme != nil { return u }
        let base = server.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        return URL(string: base + (path.hasPrefix("/") ? path : "/" + path))
    }
}

extension APIClient {
    nonisolated func sharedAbsolute(server: String, path: String) throws -> URL {
        guard let u = APIClientURL.absolute(server, path) else { throw APIError.badServer }
        return u
    }
}

extension String {
    var urlEncoded: String { addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? self }
}
