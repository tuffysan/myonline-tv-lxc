# Backup and rollback

## Automatic pre-update backup

Before every v0.3+ update:

```text
/var/lib/myonlinetv/backups/pre-update-OLD-to-NEW-TIMESTAMP.tar.gz
```

contains the persistent configuration except `downloads/` and `backups/`.

## Binary rollback

The updater keeps:

```text
/opt/myonlinetv/publish.rollback
```

and automatically restores it when `/health` or `/ready` fails.

## Manual rollback

```bash
CTID=145 ./rollback.sh
```

## Restore data too

```bash
CTID=145 RESTORE_DATA=1 ./rollback.sh
```

This restores the last pre-update configuration snapshot. Downloaded media is not deleted or rolled back.
