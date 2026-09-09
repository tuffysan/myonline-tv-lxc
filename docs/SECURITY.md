# Security — v0.2.0

## Authentication

The first browser opening a fresh installation is asked to create the administrator account. Passwords require at least 10 characters and are stored as PBKDF2-SHA256 hashes with a random salt and 350,000 iterations.

Authentication uses an HttpOnly, SameSite=Strict cookie.

## Provider secrets

Provider connection records are encrypted with AES-256-GCM. A random 256-bit key is created at:

`/var/lib/myonlinetv/secrets.key`

The key file and provider data must be backed up together.

## v0.1.0 migration

Old plaintext provider records are backed up as `providers-v0.1.0.backup.json`, then rewritten using encrypted connection payloads. The backup still contains old plaintext secrets; after verifying the migration and making a secure backup, remove that legacy backup if you do not need it.

## Media proxy

Live/VOD/series source URLs are not returned directly by normal media APIs. The backend stores them in memory and returns tokenized `/api/proxy/...` URLs.

The proxy requires authentication.

## HLS

Unencrypted HLS is supported. Playlists that declare an encryption key are refused by the proxy/downloader. MyOnline TV does not implement DRM circumvention.

## Network exposure

The bundled Nginx config is HTTP-only because certificate/domain ownership is deployment-specific. Keep it on a trusted LAN or behind Tailscale/VPN until HTTPS is configured.

Never directly port-forward the default HTTP service to the Internet.

## Remaining v0.2.0 limitations

- Single administrator account.
- No two-factor authentication yet.
- No account lockout database; failed login receives a small delay.
- In-memory proxy tokens are invalidated by service restart.
- The v0.1.0 migration backup contains plaintext legacy credentials until you delete it.
