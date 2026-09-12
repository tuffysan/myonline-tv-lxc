# MyOnline TV v34.0.2

Build hotfix and zero-cost intelligence policy for v34.

## Fixed
- Imports the `MyOnlineTV` namespace so `ReleaseV3200`, `ReleaseV3300` and `ReleaseV3400` compile from `Program.cs`.
- Removes the invalid `ProviderStored.Enabled` access from playback diagnostics. Provider records are treated as configured records because `ProviderStored` has no Enabled property.
- Keeps the cumulative v32/v33/v34 capability endpoints.

## AI / cost policy
- No OpenAI, Claude, Anthropic, Gemini or other paid AI API is required or configured.
- External AI mode has been removed from the runtime intelligence options.
- Recommendations/discovery remain local and deterministic.
- `mandatoryRuntimeCostSek = 0` and `externalAiSupported = false`.

## Publish
Run `PUBLISH.cmd`. Its local .NET build preflight remains the authoritative compile check before publishing.

## v34.0.2 verifier correction
- Fixes the v34.0.1 verification script false positive around `.Enabled`.
- `ProviderStored` is verified specifically and remains without an `Enabled` property.
- Legitimate `Enabled` properties on media libraries, storage targets, users and other models are allowed.
- No paid or external AI dependency is introduced.
