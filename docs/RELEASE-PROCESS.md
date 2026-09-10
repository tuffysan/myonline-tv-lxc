# Release process — v0.3+

For version `0.5.4`:

1. Change `VERSION` to `0.5.4`.
2. Update `release.json`.
3. Update `<Version>` in `app/MyOnlineTV.Web.csproj`.
4. Update API/UI version strings.
5. Update CHANGELOG/README.
6. Push to `main`.
7. Wait for **Validate** to pass.
8. Tag:

```bash
git tag v0.5.4
git push origin v0.5.4
```

The release workflow builds a framework-dependent linux-x64 publish and packages:

```text
myonline-tv-web-v0.5.4-linux-x64.tar.gz
myonline-tv-lxc-v0.5.4-source.tar.gz
SHA256SUMS-RELEASE.txt
release.json
```

The Proxmox stable installer/update scripts then use the prebuilt runtime artifact rather than compiling source.
