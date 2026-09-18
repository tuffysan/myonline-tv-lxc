# v39.7.1 – IPTV Sync & Diagnostics

- Makes interval/daily IPTV Live TV refresh settings operational with a background scheduler.
- Scheduled sync preserves visibility choices and respects the “new channels active” setting.
- Adds persistent provider sync history for manual and scheduled reloads.
- Adds provider sync diagnostics with recent failures and change counts.
- Keeps manual preview/reload from v39.7.0.
- Scheduler checks every five minutes and only refreshes providers that are due.
