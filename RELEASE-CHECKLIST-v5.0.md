# MyOnline TV v5.0.0 release checklist

- Run `PUBLISH.cmd` on a machine with the .NET 10 SDK.
- Require a clean `dotnet build` before tagging.
- Confirm the GitHub release contains linux-x64 artifact, source archive, `release.json` and `SHA256SUMS-RELEASE.txt`.
- Upgrade a test LXC with an explicit `MYONLINE_REF=v5.0.0`.
- Smoke-test sign-in, Home, Live, Guide, Movies, Series, Library, DVR, Search, Admin and playback.
- Verify a backup before production upgrade.
