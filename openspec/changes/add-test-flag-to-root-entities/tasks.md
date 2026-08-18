## 1. Data Model And Auth Context

- [x] 1.1 Add required `isTest` fields with default `false` to root entity models, starting with `Cat` and `Location`.
- [x] 1.2 Create and apply a Prisma migration that backfills existing cats and locations as non-test entities.
- [x] 1.3 Regenerate Prisma client artifacts after the schema change.
- [x] 1.4 Include `isTest` in authenticated request user typing and session validation output.
- [x] 1.5 Update backend test user/session fixtures to support both test and regular authenticated users.

## 2. Location Partitioning

- [x] 2.1 Pass the authenticated current user's test status from location controller methods into `LocationsService`.
- [x] 2.2 Set `Location.isTest` from the current user's test status during location creation.
- [x] 2.3 Filter location list, detail, update, archive, and owner lookup operations by current user test status.
- [x] 2.4 Ensure opposite-status location detail and mutation requests behave as unavailable without disclosing the entity.

## 3. Cat Partitioning

- [x] 3.1 Pass the authenticated current user's test status from cat controller methods into cat service and command paths.
- [x] 3.2 Set `Cat.isTest` from the current user's test status during cat creation.
- [x] 3.3 Filter cat list and detail reads by current user test status.
- [x] 3.4 Enforce current user test status on cat update, photo, weight, tag assignment, and history paths by scoping through the matching cat.
- [x] 3.5 Validate cat location references using both active status and matching `isTest` so cross-status cat-location relationships cannot be created or updated.

## 4. API Types And Frontend Compatibility

- [x] 4.1 Update backend response shapes or DTO-adjacent types that serialize cats and locations to include `isTest` where root entities are returned.
- [x] 4.2 Update frontend API types for cats and locations to accept the new `isTest` field without requiring UI changes.
- [x] 4.3 Confirm existing frontend flows continue to load cats and locations through the partitioned APIs.

## 5. Verification

- [x] 5.1 Add backend tests proving test users create test cats and locations while regular users create regular cats and locations.
- [x] 5.2 Add backend tests proving list and detail reads exclude opposite-status cats and locations.
- [x] 5.3 Add backend tests proving cat operations cannot reference opposite-status locations.
- [x] 5.4 Add regression coverage for child cat operations, including photos, weights, tags, and history, to ensure they remain scoped through the matching cat.
- [x] 5.5 Run backend unit/integration tests and relevant frontend type/test checks.
- [x] 5.6 Run OpenSpec validation for `add-test-flag-to-root-entities`.
