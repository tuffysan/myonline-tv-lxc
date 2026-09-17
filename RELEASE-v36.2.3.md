# v36.2.3 — Desktop Hero Hard Cap

Hotfix for desktop/laptop Home. The v36.2.2 density CSS was preceded by literal `\n` characters, which caused the browser to ignore the intended rule. This release removes the invalid tokens and adds a deterministic hard cap for the desktop hero: 260 px normally and 220 px on low-height laptop viewports. TV and touch layouts are not changed.
