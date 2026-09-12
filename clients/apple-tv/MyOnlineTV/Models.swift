import Foundation

struct AuthStatus: Codable {
    var configured: Bool?
    var authenticated: Bool?
    var user: String?
    var role: String?
    var requirePasswordChange: Bool?
    var onboardingRequired: Bool?
}

struct LoginResponse: Codable {
    var user: String
    var role: String
    var requirePasswordChange: Bool?
    var onboardingRequired: Bool?
}

struct OnboardingStatus: Codable {
    var required: Bool?
    var completed: Bool?
    var skipped: Bool?
    var neverShow: Bool?
    var sources: SourceCounts?
}

struct SourceCounts: Codable {
    var iptv: Int?
    var plex: Int?
    var jellyfin: Int?
}

struct Provider: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var type: String
    var host: String?
    var hasEpg: Bool?
    var owner: String?
}

struct Channel: Codable, Identifiable, Hashable {
    var id: String
    var key: String
    var name: String
    var group: String?
    var number: Int?
    var logo: String?
}

struct MediaItem: Codable, Identifiable, Hashable {
    var id: String
    var name: String
    var year: String?
    var rating: String?
    var plot: String?
    var genre: String?
    var poster: String?
}

struct SeriesInfo: Codable {
    var info: SeriesMetadata?
    var episodes: [String: [Episode]]?
}

struct SeriesMetadata: Codable {
    var name: String?
    var cover: String?
    var plot: String?
    var genre: String?
    var rating: String?
}

struct Episode: Codable, Identifiable, Hashable {
    var id: String
    var episodeNum: Int?
    var title: String?
    var containerExtension: String?
    var info: EpisodeInfo?
}

struct EpisodeInfo: Codable, Hashable {
    var movieImage: String?
    var plot: String?
    var duration: String?
}

struct PlaybackToken: Codable {
    var token: String?
    var url: String?
    var proxyUrl: String?
    var playlistUrl: String?
    var statusUrl: String?
}

struct LiveStart: Codable {
    var playlistUrl: String?
    var statusUrl: String?
    var token: String?
}

struct EpgEntry: Codable, Identifiable, Hashable {
    var id: String { "\(channel)-\(start ?? "")-\(title)" }
    var channel: String
    var title: String
    var start: String?
    var stop: String?
    var description: String?
}
