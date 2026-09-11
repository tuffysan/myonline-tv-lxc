namespace MyOnlineTV.Web;
public sealed record BackupManifest(string Version,DateTimeOffset CreatedAt,IReadOnlyList<string> Components,string Checksum);
public sealed record RestorePlan(string BackupVersion,IReadOnlyList<string> Components,bool Compatible,IReadOnlyList<string> Warnings);
