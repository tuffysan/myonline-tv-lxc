# Performance & Security v9.8

Required verification:
- rate limiting on auth/pairing/control endpoints
- structured logging with correlation IDs
- no provider/device secrets in logs
- bounded caches
- provider timeouts/retries
- FFmpeg concurrency limits
- stale playback-session cleanup
- catalogue load testing
- repeated Live channel-change soak test
