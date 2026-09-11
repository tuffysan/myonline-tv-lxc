# v28.1.0 — Architecture & Cleanup

Current runtime layers:
1. Web/PWA and Android TV clients
2. ASP.NET Core API
3. provider/media adapters
4. playback/live HLS runtime
5. DVR/storage
6. local configuration and profile state

Rules:
- Provider credentials stay server-side.
- UI features must map to real API/runtime behavior.
- New releases must not be declared production-ready from documentation alone.
- `scripts/Validate-Architecture.ps1` checks the required project structure and Kestrel regression.
