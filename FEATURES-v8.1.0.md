# v8.1.0 — Source & Playback Integration

Adds concrete server-side source-access policy and playback resolution services on top of the v7/v8 contracts.

Goals:
- one authorization decision before playback resolution,
- no provider credentials returned to clients,
- shared playback result for Web/PWA and Android TV,
- additive migration path while proven legacy playback routes remain available.

This release creates reusable integration services; each existing route still needs to call them before v8.1 can be called fully enforced end-to-end.
