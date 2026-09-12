# v8.2.0 — Device & QR Pairing

Adds an in-process pairing service with expiring six-digit challenges, approval, trusted-device registration, listing and revocation.

For production:
- move state to persistent storage,
- protect approval with authenticated user context,
- issue signed/rotatable device tokens,
- add rate limiting and audit logging,
- expose only HTTPS endpoints.
