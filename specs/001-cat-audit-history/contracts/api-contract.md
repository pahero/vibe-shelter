# API Contract: Cat Audit History

## Authentication and Authorization

All contracts require an authenticated user. Access to cat history follows the same authorization
rules as viewing the cat record.

## Create Cat

`POST /api/cats`

### Behavior Change

The created cat records the authenticated user's identifier as creator.

### Response Requirements

- Returns the cat card as before.
- Does not expose internal photo storage keys.
- May include creator metadata in future responses, but the required behavior is persisted creator attribution.

### Acceptance Checks

- A cat created by user A stores user A as creator.
- Updating the cat later as user B does not change the creator.

## Update Cat

`PATCH /api/cats/{catId}`

### Behavior Change

A successful update creates one granular audit event per changed auditable field, such as
`name_changed`, `status_changed`, or `current_location_changed`.

### Acceptance Checks

- Field-change events include `oldValue` and `newValue` directly on the audit event.
- Failed updates create no audit event.
- No-op updates create no audit event.
- The event actor is the authenticated user performing the update.

## Add Cat Photo

`POST /api/cats/{catId}/photos`

### Behavior Change

A successful photo addition records the authenticated user as photo creator and creates one
`photo_created` audit event.

### Acceptance Checks

- The active gallery includes the new photo.
- The cat history includes a `photo_created` event with actor, time, photo identity, and a derived
  photo link.

## Delete Cat Photo

`DELETE /api/cats/{catId}/photos/{photoId}`

### Behavior Change

A successful photo deletion removes the photo from the active gallery, records the authenticated
user as deleter, and creates one `photo_deleted` audit event with the photo identity needed to
derive the old photo link.

### Acceptance Checks

- The active gallery no longer lists the deleted photo.
- The cat history includes a `photo_deleted` event with actor, time, deleted photo identity, and a
  derived historical photo link.
- Deleting a missing or already deleted photo returns the existing not-found behavior and creates no audit event.

## List Cat History

`GET /api/cats/{catId}/history`

### Response Shape

```json
{
  "data": [
    {
      "id": "audit-event-id",
      "catId": "cat-id",
      "eventType": "name_changed",
      "occurredAt": "2026-08-10T12:00:00.000Z",
      "actor": {
        "id": "user-id",
        "displayName": "Staff Member",
        "email": "staff@example.com"
      },
      "oldValue": "Mila",
      "newValue": "Mila Bean",
      "photo": null
    },
    {
      "id": "photo-created-event-id",
      "catId": "cat-id",
      "eventType": "photo_created",
      "occurredAt": "2026-08-10T12:03:00.000Z",
      "actor": {
        "id": "user-id",
        "displayName": "Staff Member",
        "email": "staff@example.com"
      },
      "oldValue": null,
      "newValue": null,
      "photo": {
        "id": "photo-id",
        "link": "https://example.test/photos/photo-id",
        "status": "ACTIVE"
      }
    },
    {
      "id": "photo-event-id",
      "catId": "cat-id",
      "eventType": "photo_deleted",
      "occurredAt": "2026-08-10T12:05:00.000Z",
      "actor": {
        "id": "user-id",
        "displayName": "Staff Member",
        "email": "staff@example.com"
      },
      "oldValue": null,
      "newValue": null,
      "photo": {
        "id": "photo-id",
        "link": "https://example.test/photos/photo-id",
        "status": "DELETED"
      }
    }
  ],
  "total": 3,
  "skip": 0,
  "limit": 50
}
```

### Query Parameters

- `skip`: Optional non-negative integer for pagination.
- `limit`: Optional integer from 1 to 100.

### Acceptance Checks

- Returns events for only the selected cat.
- Newest events are returned first by default.
- Event type is present for every entry.
- Every `photo_created` and `photo_deleted` entry includes a `photo.link` derived from the referenced
  photo identity.
