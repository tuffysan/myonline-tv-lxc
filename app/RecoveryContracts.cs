namespace MyOnlineTV.Web;

public sealed record RecoveryPoint(
    string Id,
    string Version,
    DateTimeOffset CreatedAt,
    string Path,
    string Checksum,
    bool Verified);

public sealed record RollbackPlan(
    string CurrentVersion,
    string TargetVersion,
    string RecoveryPointId,
    bool DataRestoreRequired,
    IReadOnlyList<string> Warnings);
