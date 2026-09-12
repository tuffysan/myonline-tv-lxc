# v31.1.0 compile hotfix

This corrected v31.1.0 fixes the build failure in `LocalDb.cs`.

Changes:
- Replaced malformed C# raw SQL literals with compile-safe string concatenation.
- Preserved the same SQLite schema and LocalDb API.
- Added an explicit `SQLitePCLRaw.bundle_e_sqlite3` 2.1.12 package reference to override the vulnerable 2.1.11 transitive native SQLite bundle where NuGet resolution permits it.
- Kept version 31.1.0 because the original build failed and was not published.
