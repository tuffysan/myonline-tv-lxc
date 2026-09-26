# MyOnline TV v40.6.2 — Release Gate & Handover Fix

This maintenance release fixes the v40.6.1 release regression gate for Continuous VOD handover.

The v40.6.1 implementation already keeps the currently playing session alive while a replacement VOD session is prebuffered. The failing test incorrectly searched for an exact comment (`Do not stop the currently playing VOD session here`) that did not exist in `Program.cs`.

The hardened test now validates executable capability markers instead: creation/registration of the replacement session, the explicit session-delete endpoint used after client handover, and the existing client-side old-session cleanup.

No playback or player-layout behavior is intentionally changed in this release.
