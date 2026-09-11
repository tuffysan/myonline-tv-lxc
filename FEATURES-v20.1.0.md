# v22.0.0 — Feature Completion

This release changes the project from a version-history view to an audited capability view.

## Status definitions

- **FULLY IMPLEMENTED** — server route/runtime behavior and user-facing flow are both present.
- **PARTIAL** — useful behavior exists, but an important end-to-end part is still missing or split across legacy/new implementations.
- **FOUNDATION** — contracts/models/helpers exist, but the feature is not a complete user-facing workflow.
- **MISSING** — no completed production implementation is present.

## Important result

v22.0.0 intentionally does **not** claim that every feature proposed before v20 is complete.

The application now exposes the audit in:

- Admin → **Feature Completion**
- `GET /api/admin/feature-completion`
- `GET /api/platform/cost-policy`

## Permanent cost rule

Mandatory runtime cost introduced by MyOnline TV: **0 SEK**.

Commercial AI, paid metadata, SaaS monitoring and paid automation are not required. Optional user-configured third-party services may still have their own costs, but MyOnline TV does not silently enable them.
