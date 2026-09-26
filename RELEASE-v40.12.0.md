# MyOnlineTV v40.12.0 — Live TV Reliability

Focus: make Live TV resilient to short provider/network interruptions and keep playback near the live edge.

## Changes
- Dedicated Live TV reliability watchdog separate from VOD reliability.
- Automatic HLS network/media recovery and auto-resume after transient stalls.
- Escalating restart after repeated recovery failures, without treating an intentional Pause as a failure.
- Generation guard prevents stale channel-start requests from taking over after rapid channel changes.
- Live-edge tuning with bounded latency and catch-up playback rate.
- Server HLS live window expanded from 6 to 12 two-second segments and independent segment boundaries enabled.
- Cleanup stops reliability timers when leaving/changing playback.
- Release regression checks protect the Live TV reliability engine.
