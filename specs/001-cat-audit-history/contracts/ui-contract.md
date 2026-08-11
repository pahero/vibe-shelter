# UI Contract: Cat History Tab

## Location

The cat profile page includes a history tab or history section for the selected cat.

## Required Display States

- Loading state while history is being fetched.
- Empty state when no audit events exist.
- Error state when history cannot be loaded.
- Chronological event list with newest events first.

## Required Event Rendering

### Cat Field Update

- Shows the specific field-change event type in staff-readable language.
- Shows actor display name or email fallback.
- Shows event time in the same date/time style used elsewhere on the cat page.
- Shows each changed field with previous and new values.

### Photo Created

- Shows event type as a photo addition.
- Shows actor display name or email fallback.
- Shows event time.
- Shows a link or thumbnail for the added photo.

### Photo Deleted

- Shows event type as a photo deletion.
- Shows actor display name or email fallback.
- Shows event time.
- Shows a link to the deleted photo, even though the photo is absent from the active gallery.

## Interaction Requirements

- Staff can reach the history view from the cat profile without leaving the cat context.
- Staff can distinguish granular field-change event types, `photo_created`, and `photo_deleted`
  entries without reading raw codes.
- Every photo event displays a photo link.
- Deleted-photo links are clearly labeled as historical/deleted-photo links.

## Acceptance Checks

- After changing a cat name, the history tab shows who changed it and the old/new names.
- After adding a photo, the history tab shows a `photo_created` entry with actor and a photo link.
- After deleting a photo, the history tab shows a `photo_deleted` entry with actor and an old photo
  link.
- When no history exists, the tab states that no changes have been recorded.
