public enum FeatureCompletionStatus
{
    FullyImplemented,
    Partial,
    Foundation,
    Missing
}

public sealed record FeatureCompletionItem(
    string Id,
    string Area,
    string Name,
    FeatureCompletionStatus Status,
    string Evidence,
    string NextAction,
    bool ZeroMandatoryCost = true);

public static class FeatureCompletionCatalog
{
    public static readonly IReadOnlyList<FeatureCompletionItem> All =
        new FeatureCompletionItem[]
        {
            new("auth","Core","Authentication & users",FeatureCompletionStatus.FullyImplemented,
                "Setup/login/logout, roles and user administration are wired to server routes and Web UI.",
                "Regression-test setup, login, logout and role enforcement."),

            new("iptv-live","Playback","IPTV Live TV",FeatureCompletionStatus.FullyImplemented,
                "Provider/channel routes, FFmpeg HLS live sessions, readiness polling/status and HLS delivery exist.",
                "Add automated channel-zap and long-running playback tests."),

            new("movies-series","Playback","IPTV Movies & Series",FeatureCompletionStatus.FullyImplemented,
                "VOD/series catalogue, detail, token and media-start routes are present and browser playback uses server media handling.",
                "Add end-to-end playback regression tests."),

            new("epg","TV","EPG / Guide",FeatureCompletionStatus.FullyImplemented,
                "EPG provider route, preferences and Guide UI are present; Guide can start playback/recording.",
                "Improve horizontal grid polish, multi-day navigation and performance."),

            new("plex-jellyfin","Library","Plex & Jellyfin",FeatureCompletionStatus.FullyImplemented,
                "Server-side media-library configuration, testing, library selection and unified catalogue routes are present.",
                "Expand compatibility testing across server versions."),

            new("source-access","Security","Source access enforcement",FeatureCompletionStatus.Partial,
                "Per-user source policy, effective-source API and SourceEngineV2 exist, but legacy media routes are not uniformly guarded through one authorization boundary.",
                "Route every provider/library/playback request through SourceEngineV2 before v21."),

            new("personal-sources","Sources","Personal sources",FeatureCompletionStatus.Partial,
                "Encrypted per-user source storage and CRUD APIs exist.",
                "Use personal IPTV/Plex/Jellyfin sources end-to-end in catalogue, search and playback."),

            new("unified-playback","Playback","Unified Playback Engine",FeatureCompletionStatus.Partial,
                "UnifiedPlaybackEngine and playback contracts exist while proven legacy Live/VOD/Series paths remain separate.",
                "Migrate playback decisions incrementally to one Direct/HLS/Remux/Transcode engine."),

            new("unified-library","Library","Unified Library & de-duplication",FeatureCompletionStatus.Partial,
                "Unified movie/series endpoints, library preferences and MetadataMatcher exist.",
                "Apply metadata matching to catalogue output so duplicates collapse into one title with selectable sources."),

            new("continue-watchlist","Experience","Continue Watching / favourites",FeatureCompletionStatus.FullyImplemented,
                "Continue Watching state, poster updates, favourites and profile media-state APIs/UI exist.",
                "Unify all watch-state paths around profile state and add automatic next-episode handling."),

            new("home","Experience","Premium Home experience",FeatureCompletionStatus.Partial,
                "Home rails, recent content/source cards and HomeComposer foundation exist.",
                "Finish personalized rails, consistent artwork, Now/Next and Watchlist presentation."),

            new("search","Experience","Global Search",FeatureCompletionStatus.Partial,
                "Search UI covers multiple current sources.",
                "Include EPG future results, recordings, personal sources and metadata-ranked results in one index."),

            new("android-tv","Clients","Android TV",FeatureCompletionStatus.Partial,
                "Native Android TV project, Media3 foundation, navigation state and server API models exist.",
                "Finish native Home/Guide/player overlays, D-pad polish and real-device regression suite."),

            new("mobile","Clients","Mobile application",FeatureCompletionStatus.Foundation,
                "Server/device/multi-room contracts support a future mobile client.",
                "Create native Android/iOS or one cross-platform mobile client and offline workflow."),

            new("pairing","Devices","Device pairing",FeatureCompletionStatus.Partial,
                "Pairing service, device contracts and trust/revoke semantics exist.",
                "Persist pairing/device tokens securely and complete TV/mobile pairing UI."),

            new("remote","Devices","Mobile remote control",FeatureCompletionStatus.Foundation,
                "Remote-control and realtime contracts exist.",
                "Wire realtime transport and phone-to-TV command UI."),

            new("multiroom","Devices","Multi-room / handoff",FeatureCompletionStatus.Partial,
                "Rooms, handoff route, MultiRoom contracts/session models and household preferences exist.",
                "Add realtime playback synchronization and robust resume/handoff acknowledgement."),

            new("dvr","DVR","DVR / recording",FeatureCompletionStatus.Partial,
                "Recording jobs, rules, storage targets, conflicts, engine preferences and retention foundations exist.",
                "Complete recurring series scheduler, New Only semantics, priorities and automatic retention execution."),

            new("sports","DVR","Sports mode",FeatureCompletionStatus.Foundation,
                "Sports preferences/rule contracts exist.",
                "Build EPG sports matching, team preferences, reminders and optional auto-record."),

            new("downloads","Offline","Downloads",FeatureCompletionStatus.Partial,
                "Download jobs, device download token and storage-target handling exist.",
                "Complete offline mobile library, expiry/storage management and client download UX."),

            new("metadata","Discovery","Metadata enrichment",FeatureCompletionStatus.Partial,
                "Metadata contracts and matcher exist.",
                "Add free/local metadata enrichment and caching without mandatory commercial API."),

            new("discovery","Discovery","Local recommendations",FeatureCompletionStatus.Foundation,
                "LocalDiscoveryEngine is implemented and external AI defaults to disabled/0 SEK.",
                "Wire local recommendations into Home rails using watch/favourite/profile signals."),

            new("voice","Discovery","Voice / natural-language control",FeatureCompletionStatus.Foundation,
                "LocalIntentParser provides no-cost local intent parsing.",
                "Connect platform/native speech input where available; keep external AI optional."),

            new("multiview","TV","Multi-view",FeatureCompletionStatus.Missing,
                "No production multi-stream compositor/view is wired.",
                "Implement client/server resource-aware 2-up/4-up live playback."),

            new("pip","TV","Picture-in-Picture",FeatureCompletionStatus.Missing,
                "No completed cross-client PiP implementation is evidenced.",
                "Add Web PiP plus Android TV/client-specific equivalent where supported."),

            new("catchup","TV","Catch-up / Start Over",FeatureCompletionStatus.Missing,
                "No generic provider capability and playback flow is completed.",
                "Detect compatible IPTV catch-up capability and expose Start Over only when provider supports it."),

            new("automation","Automation","Smart Home automation",FeatureCompletionStatus.Foundation,
                "Local AutomationEngine and LAN/Home Assistant design exist.",
                "Expose authenticated local webhook/Home Assistant integration and event triggers."),

            new("notifications","Automation","Notifications",FeatureCompletionStatus.Partial,
                "Local notification routes/UI exist.",
                "Generate notifications automatically from DVR, storage, provider health and sports rules."),

            new("plugins","Platform","Plugin/provider platform",FeatureCompletionStatus.Foundation,
                "Versioned plugin interfaces and manifest contracts exist.",
                "Build discovery/loading sandbox, capability validation and first external plugin example."),

            new("operations","Platform","Operations dashboard",FeatureCompletionStatus.Partial,
                "System/diagnostics/platform/operations endpoints and UI exist.",
                "Consolidate stream, FFmpeg, provider, DVR and storage telemetry into one live operations page."),

            new("self-healing","Platform","Self-healing",FeatureCompletionStatus.Foundation,
                "HealthSignal and SelfHealingPlanner exist.",
                "Wire safe bounded recovery actions with audit log and circuit breakers."),

            new("backup-rollback","Platform","Backup / restore / rollback",FeatureCompletionStatus.FullyImplemented,
                "Backup, restore, migration readiness and updater rollback mechanisms exist.",
                "Automate restore verification in disposable LXC CI."),

            new("release-qa","Quality","Automated release QA",FeatureCompletionStatus.Partial,
                "Shell/JS validation, GitHub release workflow and health/rollback checks exist.",
                "Add disposable LXC install/upgrade/playback smoke tests and Android build/runtime tests."),

            new("zero-cost","Policy","Zero mandatory runtime cost",FeatureCompletionStatus.FullyImplemented,
                "Paid AI/cloud services are not required; external AI defaults disabled and budget is 0 SEK.",
                "Keep this as a permanent release gate.")
        };

    public static object Summary()
    {
        var total = All.Count;
        return new
        {
            version = "22.0.0",
            total,
            fullyImplemented = All.Count(x => x.Status == FeatureCompletionStatus.FullyImplemented),
            partial = All.Count(x => x.Status == FeatureCompletionStatus.Partial),
            foundation = All.Count(x => x.Status == FeatureCompletionStatus.Foundation),
            missing = All.Count(x => x.Status == FeatureCompletionStatus.Missing),
            zeroMandatoryCost = All.All(x => x.ZeroMandatoryCost)
        };
    }
}
