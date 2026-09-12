# v9.0.0 Stable Platform release gate

v9.0.0 is stable only when:
- server CI build succeeds,
- Android release build succeeds,
- clean LXC install succeeds,
- upgrade and rollback succeed,
- Source Engine authorization is enforced across all relevant routes,
- playback contract is exercised from Web/PWA and Android TV,
- device pairing/remote commands are security tested,
- DVR conflict scenarios pass,
- backup/restore is verified,
- no secrets appear client-side or in logs,
- v8.9 RC regression suite passes.
