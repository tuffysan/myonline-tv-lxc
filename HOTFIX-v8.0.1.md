# v8.0.1 — Updater cleanup hotfix

Fixes an upgrade failure after a release artifact has already been successfully
uploaded, gzip-validated, extracted and application-validated.

Observed on Proxmox:

```text
Step    : 3/8 Cleanup uploaded release artifact
Command : pct exec "$CTID" -- rm -f /tmp/myonline-tv-release.tar.gz
Exit    : 129
```

The temporary archive is no longer part of the installed application once
`publish.new` has been verified. Cleanup is therefore best-effort and cannot
abort the upgrade.

If `pct exec` returns a transient non-zero exit status during cleanup, the
updater prints a warning and continues to the rollback snapshot / activation
steps.
