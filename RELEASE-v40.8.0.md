# MyOnlineTV v40.8.0 — Instant Seek

Playback quality release built on verified v40.7.0.

## Highlights
- Debounced seek: rapid timeline movement only commits the newest request.
- Buffered seeks use the current media buffer immediately without restarting FFmpeg.
- Unbuffered seeks prepare a replacement VOD session in the background.
- Current frame/session remains visible until replacement segments are ready.
- Superseded replacement sessions are cancelled and cleaned up.
- Timeline remains interactive during seek; no disabled seek bar.
- Existing Smart VOD Buffering, Continuous VOD handover and Playback Reliability remain active.

## Release gate
Adds regression coverage for Instant Seek capability, debounce/generation cancellation, buffered fast path and non-blocking timeline behavior.
