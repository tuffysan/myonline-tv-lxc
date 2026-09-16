# MyOnline TV Platform v9

v9 is the stable architecture baseline for:

- ASP.NET Core/.NET server
- Web/PWA client
- Android TV client
- Source authorization
- Unified playback contracts
- Device/pairing architecture
- Realtime/remote protocol
- Metadata matching
- DVR scheduling/conflicts
- Operations and recovery

## Stability rule

The presence of a class or contract is not proof of production readiness. A v9 production deployment is approved only after the v8.9/v9 release gates have passed in CI and on a disposable/real test LXC.

## Forward development

Post-v9 work should prefer:
1. tests and end-to-end wiring,
2. performance and reliability,
3. native mobile client,
4. richer metadata,
5. multi-room UX,
before another broad architecture rewrite.
