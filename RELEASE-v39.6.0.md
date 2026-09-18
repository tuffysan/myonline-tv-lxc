# v39.6.0 – UX Consistency (Safe)

First feature release after the v39.5.x UI recovery.

- Reusable component-scoped toast/status system.
- Opt-in busy/loading state with ARIA support.
- Opt-in focus memory/restore helpers.
- Reusable empty-state renderer.
- Mobile-safe toast placement and reduced-motion support.

## Regression guardrails
This release does not replace Home, Search, Live TV, Guide, authentication,
onboarding, player or navigation. It adds no global control sizing, no global
device layout override and no DOMContentLoaded API/bootstrap behavior.
