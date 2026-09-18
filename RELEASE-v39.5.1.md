# v39.5.1 – UI Recovery

Recovery release for the v39.5.0 multi-device UI regression.

- Removes the duplicate Setup Wizard that could start before authentication.
- Restores the existing authenticated `firstLoginGuide()` / `onboardingRequired` flow as the only onboarding path.
- Disables the duplicate Simple Home DOMContentLoaded bootstrap; the established authenticated `home()` remains authoritative.
- Removes global minimum-height styling from all buttons, links, inputs, selects and tabindex elements.
- Makes TV detection conservative instead of inferring TV mode from viewport/pointer characteristics alone.
- Removes automatic DOM mutation of missing image alt attributes and button types.
- Keeps accessibility preferences opt-in.
- Keeps adaptive action-sheet sizing scoped to the action-sheet component.
- Removes TV-specific global focus/layout overrides that changed established screens.
- Preserves v39.5.0 application functionality while prioritizing visual and authentication recovery.
