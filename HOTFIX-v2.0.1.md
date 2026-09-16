# v2.0.1 navigation hotfix

Root cause: v1.3/v1.7/v1.9/v2.0 added Library, Rooms, Alerts and Appliance menu entries and view functions, but the central `show(v)` dispatcher inherited from the older baseline did not receive dispatch branches for those four views.

Fixed mappings:
- `library` → `unifiedLibraryView()`
- `rooms` → `roomsView()`
- `notifications` → `notificationsView()`
- `appliance` → `applianceView()`

This explains the reported symptom exactly: the title/navigation state changed, but the content area did not render a new view.
