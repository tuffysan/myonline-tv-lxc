# Admin audit — corrected v31.2.0

The v31.2.0 Admin area was reviewed against the actual UI and API wiring.

## Fixed
- Add user now opens the editor instead of focusing a hidden field inside a collapsed panel.
- Edit account opens the editor and populates values.
- New users automatically receive a personal viewer profile.
- Legacy `Main`/`default` profiles are migrated toward per-user profiles.
- Default personal profile name is the username.
- Profile name, icon and Kids setting are editable.
- Profile ownership is stored as `OwnerUsername`.
- Account rename keeps profile ownership in sync and renames an untouched username-named profile.
- Account deletion removes owned profiles/access/policies.
- Profile changes are Admin-only.
- Profile-access UI is clearer and usable on smaller screens.
- The System Update feature remains present.

## Build fix
The GitHub update checker previously referenced the shared `HttpClient` before its declaration, causing CS0841. The shared client is now declared before all update helper functions.
