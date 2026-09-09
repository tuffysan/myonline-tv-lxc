# Upgrade v0.1.0 to v0.2.0

On the Proxmox host, extract v0.2.0 and run:

```bash
CTID=145 ./update-lxc.sh
```

The updater does not delete `/var/lib/myonlinetv`.

After update:

1. Open the web UI.
2. Create the administrator account.
3. Open Settings and verify providers are present.
4. Verify Live TV and EPG.
5. For Xtream providers, verify Movies and Series.
6. Run `CTID=145 ./health-check.sh`.
7. Check `/var/lib/myonlinetv/providers-v0.1.0.backup.json`.
8. Once migration is verified and you have a secure backup, delete the old plaintext backup if desired.

Rollback binaries are kept in `/opt/myonlinetv/publish.old` by the update script, while persistent data remains in `/var/lib/myonlinetv`.
