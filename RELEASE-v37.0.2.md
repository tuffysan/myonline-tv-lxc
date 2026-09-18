# v37.0.2 – Release Verification Fix

- Keeps the resilient per-asset upload/retry flow from v37.0.1.
- Verifies the GitHub Release through the REST API using its numeric release ID.
- Correctly resumes and normalizes an existing draft/partial release after all mandatory assets are present.
- Verifies asset names and non-zero sizes before publishing/marking latest.
- Updates checkout/setup-dotnet actions to v5 to avoid the Node.js 20 deprecation warning.
