# Data Model: Cat Audit History

## Cat

Represents a shelter animal record.

### Fields Added or Changed

- `createdByUserId`: Identifier of the authenticated user who created the cat.
- `createdAt`: Existing creation timestamp.
- `updatedAt`: Existing update timestamp.

### Relationships

- Belongs to `User` through `createdByUserId`.
- Has many `CatPhoto` records.
- Has many `CatAuditEvent` records.

### Validation Rules

- `createdByUserId` is required for new cats created through authenticated workflows.
- `createdByUserId` cannot be changed by cat update actions.

## CatPhoto

Represents a photo associated with a cat.

### Fields Added or Changed

- `id`: Unique photo identifier.
- `catId`: Cat that owns the photo.
- `key`: Existing storage key or link source for the photo.
- `createdByUserId`: Identifier of the user who added the photo.
- `deletedByUserId`: Identifier of the user who deleted the photo, empty while active.
- `deletedAt`: Deletion timestamp, empty while active.
- `isDeleted`: Display-state marker derived from deletion fields or stored explicitly.
- `createdAt`: Existing creation timestamp.

### Relationships

- Belongs to `Cat`.
- Belongs to creator `User` through `createdByUserId`.
- Optionally belongs to deleting `User` through `deletedByUserId`.
- May be referenced by `CatAuditEvent` for photo-created and photo-deleted events.

### Validation Rules

- Active gallery listing excludes deleted photos.
- Deleted photo metadata remains available for audit history.
- Photo deletion records `deletedByUserId` and `deletedAt` exactly once for a successful delete.

### State Transitions

```text
ACTIVE -> DELETED
```

Deleted photos do not return to active state in this feature.

## CatAuditEvent

Represents one historical event shown in a cat's history tab.

### Fields

- `id`: Unique audit event identifier.
- `catId`: Cat whose history contains the event.
- `actorUserId`: User who performed the event.
- `eventType`: Granular type of event. Allowed values include `name_changed`, `sex_changed`,
  `color_changed`, `estimated_birth_date_changed`, `intake_date_changed`,
  `rescue_source_changed`, `microchip_number_changed`, `passport_number_changed`,
  `sterilization_status_changed`, `status_changed`, `current_location_changed`, `photo_created`,
  and `photo_deleted`.
- `occurredAt`: Timestamp when the successful action occurred.
- `oldValue`: Staff-displayable previous value for field-change events, empty for photo events.
- `newValue`: Staff-displayable new value for field-change events, empty for photo events.
- `photoId`: Photo involved in the event, present for photo events.

### Relationships

- Belongs to `Cat`.
- Belongs to actor `User` through `actorUserId`.
- Optionally references `CatPhoto` for photo events.

### Validation Rules

- `eventType` is required and must be one of the allowed values.
- `actorUserId` is required for all audit events.
- Field-change events must include `oldValue` and `newValue` directly on the audit event.
- `photo_created` and `photo_deleted` events must include `photoId` so all photo audit operations
  can expose a derived photo link in the history UI.
- Failed actions and no-op cat updates do not create audit events.

## User

Represents an authenticated staff or admin user.

### Fields Used

- `id`: Stable user identifier.
- `email`: User email for display fallback.
- `fullName`: Preferred actor display name when available.
- `status`: Current user status.

### Relationships

- Creates cats.
- Creates and deletes cat photos.
- Performs audit events.

### Validation Rules

- Audit history must preserve actor identification even if the user later becomes inactive.
