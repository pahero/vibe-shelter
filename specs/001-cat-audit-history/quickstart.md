# Quickstart: Cat Audit History Validation

## Prerequisites

- Backend dependencies are installed in `backend/`.
- Frontend dependencies are installed in `frontend/`.
- Test database and S3-compatible test storage are available through the existing project test setup.

## Backend Validation

Run from `backend/`:

```powershell
npm test
```

Expected outcomes:

- Cat creation tests prove `createdByUserId` is stored for authenticated cat creation.
- Cat update tests prove changed fields create granular audit events, such as `name_changed`, with
  actor and old/new values.
- No-op and failed update tests prove zero audit events are created.
- Photo add tests prove `photo_created` audit events include actor, photo identity, and a derived
  photo link.
- Photo delete tests prove `photo_deleted` audit events include actor, photo identity, and a derived
  deleted-photo link.
- Tests create unique cats/users/photos so they remain isolated and parallel-safe.

Run endpoint integration tests from `backend/`:

```powershell
npm run test:e2e
```

Expected outcomes:

- `GET /api/cats/{catId}/history` returns only the selected cat's events.
- Events are newest-first and include event type, actor, timestamp, and event-specific details.
- All `photo_created` and `photo_deleted` events include a `photo.link`.
- Deleted photos are absent from active gallery responses but present as links in history responses.

## Frontend Validation

Run from `frontend/`:

```powershell
npm test
npm run test:components
```

Expected outcomes:

- The cat profile history UI renders loading, empty, error, and populated states.
- Granular field-change, photo-created, and photo-deleted event types are visually distinguishable.
- All photo events expose a photo link derived from photo identity, and deleted-photo links do not
  require the photo to be in the active gallery.

## Manual Acceptance Flow

1. Sign in as staff user A.
2. Create a cat and confirm the cat record has creator attribution.
3. Change the cat name or another editable field.
4. Add a photo to the cat.
5. Delete that photo.
6. Open the cat history tab.
7. Confirm the history shows granular field-change events, a photo-created event, and a
   photo-deleted event with correct actors, event types, timestamps, and the deleted photo link
   derived from photo identity.
