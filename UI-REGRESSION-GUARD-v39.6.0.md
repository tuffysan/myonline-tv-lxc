# v39.6.0 – UI Regression Guard

Baseline: v39.5.2 Full UI Recovery.

Verified statically:
- SetupWizard remains absent.
- Simple Home pre-auth bootstrap remains absent.
- Experimental One Search API calls remain absent.
- Experimental Instant Player layer remains absent.
- Global tap-target override remains absent.
- v39.6 has no DOMContentLoaded bootstrap.
- New v39.6 CSS is scoped to `.uxConsistency*`.
- Existing application screens remain authoritative.
