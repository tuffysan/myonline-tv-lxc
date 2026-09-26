# MyOnline TV v40.3.1 – Player Layout Fix

This maintenance release fixes the inline VOD player layout introduced around Streaming Engine 2.0. Video now fills a responsive 16:9 player stage and is centered with `object-fit: contain`; fullscreen remains unchanged. Streaming, range handling, buffering and resume behavior from v40.3.0 are preserved.

## Release gate hardening
- Fixed Player Layout regression test to use the declared `stylesCss` source variable.
- Added stable compatibility aliases (`program`, `styles`, `updateLocal`) in ReleaseTests to prevent recurrence of the three source-variable compile failures encountered during v40.x release development.
