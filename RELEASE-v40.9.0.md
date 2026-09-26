# MyOnlineTV v40.9.0 – Adaptive Buffer Engine

## Purpose
Make VOD buffering respond to real playback conditions instead of relying only on fixed buffer values.

## Changes
- Adaptive target buffer range: 30–240 seconds, default 120 seconds.
- Measures HLS fragment download throughput and estimates fragment bitrate.
- Increases safety buffer when bandwidth headroom is limited, buffer is low, or stalls occur.
- Reduces unnecessary buffering when bandwidth is strong and playback is healthy.
- Re-evaluates buffer health every five seconds and after fragment downloads.
- Exposes diagnostics through `myOnlineTvAdaptiveBufferDiagnostics()`.
- Keeps v40.8.1 Instant Seek, v40.7 Playback Reliability and Continuous VOD session handover.

## Release gate
Regression coverage verifies adaptive limits, throughput sampling, runtime HLS configuration, diagnostics and VOD integration.
