# v7.0.0 — MyOnline TV Platform

- Establishes API Contract v1 in `API-CONTRACT-v1.json`.
- Defines capability names for Live, EPG, Movies, Series, DVR, Library, Profiles, Search, Playback, Remote Control and Multi-room.
- Android TV gets a matching `ClientCapabilities` contract.
- Web/PWA and Android TV remain first-class cumulative clients.
- Provider credentials remain server-only.
- Clients must capability-gate optional features and ignore unknown capabilities for forward compatibility.

This release is a platform contract milestone, not a claim that every future transport/pairing workflow is fully implemented end-to-end.
