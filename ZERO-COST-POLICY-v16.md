# Zero-cost policy

MyOnline TV must not generate unavoidable running costs.

Default rules:
- no commercial AI API
- no required cloud service
- no required paid metadata service
- no telemetry SaaS
- no paid push-notification provider
- no subscription dependency introduced by MyOnline TV itself
- all optional external integrations are opt-in and disabled by default
- `ExternalMonthlyBudgetSek = 0`

Local rule-based intelligence and local models may be supported without requiring an external API.
