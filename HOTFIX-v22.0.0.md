# v23.0.0 compile hotfix

The original local preflight build failed before publication with:

`CS0103: The name 'CryptographicOperations' does not exist in the current context`

Fix:
- `CryptographicOperations.FixedTimeEquals(...)`
  → `System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(...)`

No feature behavior was changed.
