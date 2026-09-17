# v36.5.5 – Release ID Direct Creation

Fixes atomic GitHub Release publication by creating draft releases through the REST API and using the returned numeric release ID for asset upload, verification, and publication.

- Creates draft release via REST and captures `.id` directly.
- Uploads all mandatory assets by numeric release ID.
- Deletes same-name assets before upload for deterministic reruns.
- Verifies all four assets are non-empty before publication.
- Publishes and marks Latest only after successful verification.
