# AI cost policy — zero mandatory AI cost

MyOnline TV must work fully with `AiProviderMode.Disabled`.

## Default
- AI disabled.
- Discovery uses the built-in local deterministic recommendation engine.
- Metadata/search/ranking must not require a paid API.
- No API key is required for normal operation.
- Monthly external-AI budget defaults to 0 SEK.

## Optional modes
`LocalOptional` may later connect to a self-hosted/local model (for example through a configurable local HTTP endpoint).
`ExternalOptional` may use a user-configured commercial provider, but must be explicitly enabled and budget-limited.

No release may silently enable a paid AI service.
