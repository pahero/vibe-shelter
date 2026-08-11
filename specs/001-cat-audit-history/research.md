# Research: Cat Audit History

## Decision: Use a Unified Cat Audit Event With Granular Event Type

Audit history will be represented as one cat-scoped event stream. Each event has a granular event
type such as `name_changed`, `status_changed`, `photo_created`, or `photo_deleted` so the history
UI and tests can distinguish individual field changes from photo actions.

**Rationale**: The user explicitly required audit entities to be separated by event type. A unified
stream keeps the cat history tab simple while preserving clear type separation for rendering,
filtering, and validation.

**Alternatives considered**: Separate tables per event category would make per-cat chronology more
complex and duplicate actor/timestamp fields. A free-text description-only audit log would not be
testable enough and would weaken event type guarantees.

## Decision: Store Old and New Values on Cat Audit Events

Cat profile updates that change multiple auditable fields will create one granular audit event per
changed field. Each field-change event stores old and new display values directly on the audit
event.

**Rationale**: The spec requires staff to see what changed when a name or another field is changed.
Field-level records make no-op detection, display, and tests precise.

**Alternatives considered**: Storing only before/after snapshots would be harder for staff to scan
and could expose unrelated data. Storing only a generic update event would not provide the requested
field-level event type separation.

## Decision: Preserve Deleted Photo Links by Retaining Photo Metadata

Photo deletion will remove the photo from the active gallery but keep historical metadata needed for
the audit UI, including the old photo key/link and deleting actor. The physical object may be kept
or moved according to storage policy, but the audit UI must continue to provide a usable historical
link.

**Rationale**: The user required the old photo link to remain available in the audit UI after
deletion. Keeping metadata separate from active gallery visibility satisfies the audit requirement
without showing deleted photos as active photos.

**Alternatives considered**: Hard-deleting photo metadata would lose the link. Copying every deleted
photo to a separate archive object is viable but should be an implementation detail decided during
tasks if existing storage deletion behavior requires it.

## Decision: Record Actor Identifiers on Cat and Photo Mutations

Cat creation stores `created_by` on the cat. Photo creation and deletion store the responsible user
on photo metadata and create matching audit events. Cat profile updates create audit events with the
authenticated actor.

**Rationale**: The feature's core accountability value depends on identifying who created a cat,
who changed cat fields, and who created or deleted pictures.

**Alternatives considered**: Resolving actors from session logs would be unreliable and would not
survive unrelated log retention policies. Displaying only current user names without stable IDs
would be ambiguous after profile changes.

## Decision: Add a Cat History Read Contract

The backend will expose cat-specific history data to the existing cat profile page. The response
will include event type, actor display details, event time, old/new values, photo identity, and a
derived photo link where applicable. Photo links are derived from photo identity instead of being
stored on the audit event.

**Rationale**: The frontend needs a stable contract to render the history tab and verify event type
separation without relying on implementation-specific storage details.

**Alternatives considered**: Embedding audit history inside the existing cat card response would
increase payload size for every cat profile load and mix profile data with history data.

## Decision: Use Existing Authorization Scope for Cat History

Any user authorized to view a cat record can view that cat's audit history.

**Rationale**: The spec assumes existing cat-record viewing rules govern audit visibility. This is a
reasonable default and avoids creating a separate permission model during this feature.

**Alternatives considered**: Admin-only history would reduce visibility for staff workflows and was
not requested. Public history is not acceptable because audit entries contain user accountability
data.
