# v30.1.0 — Multi-device polish

Target devices:
- Phone (portrait + landscape)
- Tablet (portrait + landscape)
- Desktop/laptop
- TV / 10-foot browser UI
- Installed PWA

Changes:
- Improved device-mode detection using width, orientation, pointer and hover capability.
- TV mode now also covers common 1280/1366 coarse/no-hover TV browser viewports.
- Safe-area support for phones with notches/home indicators.
- Dynamic viewport units (`dvh`) for mobile browser chrome.
- Phone-landscape playback layout.
- Tablet-specific Live TV layouts.
- Desktop ultrawide max-content behavior.
- Larger TV focus targets and visible D-pad focus.
- Touch manipulation and minimum target sizing.
- Reduced-motion accessibility support.
- PWA standalone safe-area support.

Important:
Static responsive validation cannot replace testing on physical devices. Android TV still requires its native client build/smoke test before claiming Android-TV verification.
