## Why

Test users need isolated data so test-created cats, locations, and other root records do not appear in regular user workflows, and regular user data does not pollute test workflows. Users already carry a test-user marker, but root entities do not yet carry the corresponding marker needed to partition data by the current user's status.

## What Changes

- Add a required test-entity marker to root domain entities such as cats and locations.
- Ensure root entity creation derives the marker from the authenticated current user's test status rather than client-provided input.
- Filter root entity reads so test users see test entities and regular users see non-test entities.
- Preserve existing authorization and validation behavior while adding test-status isolation.
- Backfill or default existing root entities as non-test unless a stronger existing signal identifies them as test data.

## Capabilities

### New Capabilities
- `entity-test-isolation`: Defines test-status partitioning for root entities created and viewed by test versus regular users.

### Modified Capabilities

## Impact

- Backend data model and migrations for root entities including cats and locations.
- Backend create/list/detail/update flows for root entities that must derive and enforce the test marker.
- API responses and frontend types that expose root entity fields may include the test marker when entities are returned.
- Automated tests for user-status-based creation and filtering across cats and locations.
