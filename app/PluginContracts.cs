namespace MyOnlineTV.Web;
public interface IMyOnlinePlugin {
 string Id { get; }
 string Name { get; }
 Version ApiVersion { get; }
}
public interface IMediaSourcePlugin : IMyOnlinePlugin {
 Task<IReadOnlyList<PluginMediaItem>> SearchAsync(string query,CancellationToken cancellationToken);
}
public sealed record PluginMediaItem(string Id,string Title,string Kind,string? ArtworkUrl=null);
public sealed record PluginManifest(string Id,string Name,string Version,string EntryAssembly,string[] Capabilities);
