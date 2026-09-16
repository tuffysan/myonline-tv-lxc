# v8.9.0 — Production RC gate

## Build
- dotnet restore/build/publish on .NET 10
- Android `assembleDebug` and `assembleRelease`
- JavaScript syntax/build validation
- shell syntax validation

## Installation
- clean LXC installation
- upgrade from v8.0.1
- upgrade from latest v8.x
- rollback test

## Security
- direct route access cannot bypass source policy
- provider credentials never leave server
- pairing codes expire
- remote control requires trusted same-user devices
- logs contain no secrets

## Playback
- Live startup/recovery
- VOD movie
- Series episode
- resume
- network interruption
- FFmpeg cleanup

## Functional
- Guide
- Search
- Profiles
- Favorites
- Continue Watching
- DVR / conflicts
- Backup + restore

## Clients
- Web/PWA regression
- Android TV D-pad/focus
- Android TV subtitles/audio
- 60-minute soak test
