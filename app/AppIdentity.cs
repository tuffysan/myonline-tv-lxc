public static class AppIdentity
{
    public static string Version =>
        System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0";

    public static string UserAgent(string component = "MyOnline-TV") => $"{component}/{Version}";
}
