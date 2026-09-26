# v40.4.1 — VOD Seek Build Fix

This patch fixes the Release build failure in `app/Program.cs` when `ProbeDurationSeconds` returns `double?`.

The seek start calculation now unwraps a missing duration safely and uses explicit `double` operands. No VOD seek behavior from v40.4.0 is intentionally removed.
