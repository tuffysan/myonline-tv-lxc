# v31.1.3 — Never Show Onboarding Guide

Adds a third onboarding choice:

- **Start setup** — continue with the normal first-login setup.
- **Skip for now** — dismiss the guide for now.
- **Never show this guide again** — permanently suppress automatic onboarding for that user.

The permanent choice is stored server-side per user and survives logout, restart and use from another device.
The user can still deliberately start the setup guide later; doing so clears the permanent suppression flag.
