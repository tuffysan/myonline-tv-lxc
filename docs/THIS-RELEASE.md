# MyOnline TV v0.5.7 — Admin & Provider Management

## Users
The original administrator is migrated automatically to the new multi-user store. Administrators can create and edit users with Admin/User roles, enable or disable accounts, reset passwords and remove users. At least one enabled administrator must remain.

Passwords remain PBKDF2-SHA256 hashes with individual salts.

## Provider editing
Admin → IPTV providers now includes Edit. URL, username and non-secret fields are loaded into the form. The stored provider password is never returned to the browser. Leave Password blank while editing to retain the existing password.

## Branding
The web UI now includes a MyOnline TV application icon, favicon and web-app manifest.

## Publishing
Use the permanent:

    PUBLISH.cmd

It reads the version from VERSION and is reused for future releases.
