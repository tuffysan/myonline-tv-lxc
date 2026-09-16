# MyOnline TV Plugin API v1
Goal: add future media/source integrations without placing provider-specific logic in the core.

Security rules:
- plugins run server-side;
- credentials never go to Web/TV clients;
- explicit capabilities;
- disabled until configured;
- no plugin may bypass Source Engine authorization;
- compatibility is versioned through API version.
