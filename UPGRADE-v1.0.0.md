# Upgrade to v1.0.0

Use the normal updater:

```bash
CTID=145 bash -c "$(curl -fsSL https://raw.githubusercontent.com/tuffysan/myonline-tv-lxc/main/update-from-github.sh)"
```

Persistent application data under `/var/lib/myonlinetv` is retained by the normal project upgrade path.

After upgrade:
1. Sign in.
2. Confirm IPTV provider connectivity.
3. Confirm Plex/Jellyfin menu visibility when configured.
4. Test one Movie and one Series episode.
5. Test Continue Watching resume.
6. Test the layout on the primary device type.
