# MyOnlineTV v39.8.5 — Stabilization

v39.8.5 is a stabilization-only follow-up to v39.8.4. It deliberately avoids new product features while the v39.8.4 security and ownership changes settle in production.

## Scope

- Preserve all v39.8.4 multi-user isolation and ownership protections.
- Preserve Continue Watching remove/clear behavior and per-user isolation.
- Preserve Unicode-safe download headers and download ownership checks.
- Update release-version protection so published v39.8.4 is the established baseline and v39.8.5 is the next patch.
- Add a target-LXC smoke test for `/health`, `/ready`, and deployed version verification.
- Fix one-click release discovery so paginated GitHub Release responses are read safely without assuming a flat `tag_name` JSON shape.

## Runtime sign-off

After upgrading the LXC, run:

```bash
bash scripts/SMOKE-TEST-v39.8.5.sh
```

Or against a non-default address:

```bash
BASE_URL=http://127.0.0.1:5080 EXPECTED_VERSION=39.8.5 bash scripts/SMOKE-TEST-v39.8.5.sh
```

The release is not considered runtime-signed-off until health/readiness pass and the installed application reports 39.8.5.
