# Release process

For a new version, for example `0.3.0`:

1. Update `VERSION`.
2. Update the application version in `app/MyOnlineTV.Web.csproj`.
3. Update the API-reported version in `app/Program.cs`.
4. Update README/CHANGELOG.
5. Commit and push to `main`.
6. Wait for the **Validate** workflow to succeed.
7. Tag the same version:

```bash
git tag v0.3.0
git push origin v0.3.0
```

The **Release** workflow rejects tags that do not match `VERSION`.

Users on the stable channel then receive the release with:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/update-from-github.sh)"
```
