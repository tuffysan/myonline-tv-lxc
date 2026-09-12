using Microsoft.Data.Sqlite;

public static class LocalDb
{
    public static void Initialize(string path)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText =
            "PRAGMA journal_mode=WAL;" +
            "PRAGMA foreign_keys=ON;" +
            "CREATE TABLE IF NOT EXISTS app_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);" +
            "CREATE TABLE IF NOT EXISTS users(" +
            "user_id TEXT PRIMARY KEY," +
            "username TEXT NOT NULL UNIQUE," +
            "updated_utc TEXT NOT NULL);" +
            "CREATE TABLE IF NOT EXISTS sources(" +
            "source_id TEXT PRIMARY KEY," +
            "user_id TEXT NOT NULL," +
            "source_type TEXT NOT NULL," +
            "name TEXT NOT NULL," +
            "updated_utc TEXT NOT NULL);" +
            "CREATE INDEX IF NOT EXISTS ix_sources_user ON sources(user_id, source_type);" +
            "CREATE TABLE IF NOT EXISTS source_health(" +
            "source_id TEXT PRIMARY KEY," +
            "ok INTEGER NOT NULL," +
            "latency_ms INTEGER," +
            "detail TEXT," +
            "checked_utc TEXT NOT NULL);" +
            "CREATE TABLE IF NOT EXISTS epg_aliases(" +
            "user_id TEXT NOT NULL," +
            "source_id TEXT NOT NULL," +
            "channel_key TEXT NOT NULL," +
            "epg_key TEXT NOT NULL," +
            "PRIMARY KEY(user_id,source_id,channel_key));" +
            "CREATE TABLE IF NOT EXISTS media_index(" +
            "user_id TEXT NOT NULL," +
            "media_key TEXT NOT NULL," +
            "source_id TEXT NOT NULL," +
            "media_type TEXT NOT NULL," +
            "title TEXT NOT NULL," +
            "year INTEGER," +
            "payload_json TEXT NOT NULL," +
            "updated_utc TEXT NOT NULL," +
            "PRIMARY KEY(user_id,media_key,source_id));" +
            "CREATE INDEX IF NOT EXISTS ix_media_search ON media_index(user_id,title);" +
            "CREATE TABLE IF NOT EXISTS user_kv(" +
            "user_id TEXT NOT NULL," +
            "key TEXT NOT NULL," +
            "value_json TEXT NOT NULL," +
            "updated_utc TEXT NOT NULL," +
            "PRIMARY KEY(user_id,key));";
        cmd.ExecuteNonQuery();

        SetMeta(path, "schema_version", "1");
    }

    private static SqliteConnection Open(string path)
    {
        var c = new SqliteConnection($"Data Source={path};Cache=Shared");
        c.Open();

        using var cmd = c.CreateCommand();
        cmd.CommandText = "PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;";
        cmd.ExecuteNonQuery();

        return c;
    }

    public static void SetMeta(string path, string key, string value)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText =
            "INSERT INTO app_meta(key,value) VALUES($k,$v) " +
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value;";
        cmd.Parameters.AddWithValue("$k", key);
        cmd.Parameters.AddWithValue("$v", value);
        cmd.ExecuteNonQuery();
    }

    public static string? GetMeta(string path, string key)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT value FROM app_meta WHERE key=$k;";
        cmd.Parameters.AddWithValue("$k", key);
        return cmd.ExecuteScalar()?.ToString();
    }

    public static void UpsertUser(string path, string userId, string username)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText =
            "INSERT INTO users(user_id,username,updated_utc) VALUES($id,$u,$now) " +
            "ON CONFLICT(user_id) DO UPDATE SET " +
            "username=excluded.username, updated_utc=excluded.updated_utc;";
        cmd.Parameters.AddWithValue("$id", userId);
        cmd.Parameters.AddWithValue("$u", username);
        cmd.Parameters.AddWithValue("$now", DateTimeOffset.UtcNow.ToString("O"));
        cmd.ExecuteNonQuery();
    }

    public static void UpsertSource(string path, string sourceId, string userId, string type, string name)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText =
            "INSERT INTO sources(source_id,user_id,source_type,name,updated_utc) VALUES($s,$u,$t,$n,$now) " +
            "ON CONFLICT(source_id) DO UPDATE SET " +
            "user_id=excluded.user_id, source_type=excluded.source_type, " +
            "name=excluded.name, updated_utc=excluded.updated_utc;";
        cmd.Parameters.AddWithValue("$s", sourceId);
        cmd.Parameters.AddWithValue("$u", userId);
        cmd.Parameters.AddWithValue("$t", type);
        cmd.Parameters.AddWithValue("$n", name);
        cmd.Parameters.AddWithValue("$now", DateTimeOffset.UtcNow.ToString("O"));
        cmd.ExecuteNonQuery();
    }

    public static string? SourceOwner(string path, string sourceId)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT user_id FROM sources WHERE source_id=$s;";
        cmd.Parameters.AddWithValue("$s", sourceId);
        return cmd.ExecuteScalar()?.ToString();
    }

    public static bool SourceBelongsTo(string path, string sourceId, string userId) =>
        string.Equals(SourceOwner(path, sourceId), userId, StringComparison.Ordinal);

    public static int SourceCount(string path, string userId)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM sources WHERE user_id=$u;";
        cmd.Parameters.AddWithValue("$u", userId);
        return Convert.ToInt32(cmd.ExecuteScalar());
    }

    public static void SaveHealth(string path, string sourceId, bool ok, long? latencyMs, string detail)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText =
            "INSERT INTO source_health(source_id,ok,latency_ms,detail,checked_utc) VALUES($s,$o,$l,$d,$now) " +
            "ON CONFLICT(source_id) DO UPDATE SET " +
            "ok=excluded.ok, latency_ms=excluded.latency_ms, detail=excluded.detail, checked_utc=excluded.checked_utc;";
        cmd.Parameters.AddWithValue("$s", sourceId);
        cmd.Parameters.AddWithValue("$o", ok ? 1 : 0);
        cmd.Parameters.AddWithValue("$l", (object?)latencyMs ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$d", detail);
        cmd.Parameters.AddWithValue("$now", DateTimeOffset.UtcNow.ToString("O"));
        cmd.ExecuteNonQuery();
    }

    public static object[] HealthRows(string path, string userId)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText =
            "SELECT s.source_id,s.source_type,s.name,h.ok,h.latency_ms,h.detail,h.checked_utc " +
            "FROM sources s LEFT JOIN source_health h ON h.source_id=s.source_id " +
            "WHERE s.user_id=$u ORDER BY s.source_type,s.name;";
        cmd.Parameters.AddWithValue("$u", userId);

        using var r = cmd.ExecuteReader();
        var rows = new List<object>();
        while (r.Read())
        {
            rows.Add(new
            {
                id = r.GetString(0),
                type = r.GetString(1),
                name = r.GetString(2),
                ok = r.IsDBNull(3) ? (bool?)null : r.GetInt32(3) == 1,
                latencyMs = r.IsDBNull(4) ? (long?)null : r.GetInt64(4),
                detail = r.IsDBNull(5) ? "Never checked" : r.GetString(5),
                checkedUtc = r.IsDBNull(6) ? null : r.GetString(6)
            });
        }

        return rows.ToArray();
    }

    public static void SetEpgAlias(
        string path,
        string userId,
        string sourceId,
        string channelKey,
        string epgKey)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText =
            "INSERT INTO epg_aliases(user_id,source_id,channel_key,epg_key) VALUES($u,$s,$c,$e) " +
            "ON CONFLICT(user_id,source_id,channel_key) DO UPDATE SET epg_key=excluded.epg_key;";
        cmd.Parameters.AddWithValue("$u", userId);
        cmd.Parameters.AddWithValue("$s", sourceId);
        cmd.Parameters.AddWithValue("$c", channelKey);
        cmd.Parameters.AddWithValue("$e", epgKey);
        cmd.ExecuteNonQuery();
    }

    public static object[] Search(string path, string userId, string q, int limit = 50)
    {
        using var c = Open(path);
        using var cmd = c.CreateCommand();
        cmd.CommandText =
            "SELECT media_key,source_id,media_type,title,year,payload_json " +
            "FROM media_index " +
            "WHERE user_id=$u AND title LIKE $q " +
            "ORDER BY title LIMIT $lim;";
        cmd.Parameters.AddWithValue("$u", userId);
        cmd.Parameters.AddWithValue("$q", "%" + q + "%");
        cmd.Parameters.AddWithValue("$lim", Math.Clamp(limit, 1, 200));

        using var r = cmd.ExecuteReader();
        var rows = new List<object>();
        while (r.Read())
        {
            rows.Add(new
            {
                key = r.GetString(0),
                sourceId = r.GetString(1),
                type = r.GetString(2),
                title = r.GetString(3),
                year = r.IsDBNull(4) ? null : (int?)r.GetInt32(4),
                payload = System.Text.Json.JsonSerializer.Deserialize<object>(r.GetString(5))
            });
        }

        return rows.ToArray();
    }

    public static (int users, int sources, int media) Counts(string path)
    {
        using var c = Open(path);

        int Count(string table)
        {
            using var x = c.CreateCommand();
            x.CommandText = "SELECT COUNT(*) FROM " + table + ";";
            return Convert.ToInt32(x.ExecuteScalar());
        }

        return (Count("users"), Count("sources"), Count("media_index"));
    }
}
