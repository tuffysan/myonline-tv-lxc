# v10.0.0 Stable release gate

Required before stable promotion:
- .NET CI green
- Android release build green
- clean LXC install green
- upgrade and rollback green
- source authorization integration tests green
- Web/PWA playback tests green
- Android TV playback tests green
- DVR conflict/retention tests green
- device pairing/revoke tests green
- backup/restore verified
- no secrets exposed in client/logs
- v9.9 regression suite green
