## Context

See `proposal.md` for motivation and `specs/entity-test-isolation/spec.md` for behavior. The current Prisma model already has `User.isTest`, while `Location` and `Cat` do not have a corresponding partition field. Cat creation receives the authenticated user id through `CreateCatHandler`, but list/read/update helper methods generally operate without the current user's test status. Location endpoints currently do not pass authenticated user context into `LocationsService` at all.

## Goals / Non-Goals

**Goals:**
- Add a consistent persisted boolean marker for root entity test status, starting with `Cat` and `Location`.
- Derive entity test status server-side from the authenticated user's `isTest` value.
- Apply the same partition filter to list, detail, update, and relationship validation paths so opposite-status entities are not exposed or linked.
- Keep existing root entity APIs otherwise compatible, including pagination, status filters, and validation semantics.

**Non-Goals:**
- Changing permissions, roles, or active/inactive user behavior.
- Letting clients request or override a test-status partition.
- Partitioning non-root child records independently when they are already scoped through a root entity, such as cat photos, weights, audit events, or cat-location join-like relationships.
- Creating a UI affordance to switch between test and regular partitions.

## Decisions

1. Use `isTest Boolean @default(false)` on each root entity.

   Rationale: The user model already uses `isTest`, and a boolean marker is enough for the current two-partition requirement. Adding the same field to `Cat` and `Location` keeps queries simple and avoids introducing a new enum with only two states.

   Alternative considered: A shared enum or tenant-like partition table. This is more extensible but unnecessary until more than two partitions exist.

2. Backfill existing cats and locations as `isTest = false` in the migration.

   Rationale: Existing data predates the marker and should remain visible to regular users. The request does not identify a reliable historical signal for test entities, so defaulting to regular is the safest compatibility choice.

   Alternative considered: Derive cat status from `createdByUser.isTest` or location status from `owner.isTest`. This risks moving legacy production data out of regular workflows if ownership or creator data is incomplete or inaccurate.

3. Add `isTest` to authenticated request user context and pass it explicitly into root entity service methods.

   Rationale: Services need the partition value for both creation and reads. Passing a small context value keeps the rule visible at call sites and avoids hidden global state.

   Alternative considered: Have every service query the current user by id before each operation. This duplicates lookups and makes the rule harder to apply consistently.

4. Scope root reads and writes by matching `isTest` in database queries.

   Rationale: Filtering at query time prevents accidental disclosure and lets count/list pagination stay consistent. Detail and update operations should use `findFirst`/equivalent with both `id` and `isTest` so opposite-status records behave as unavailable.

   Alternative considered: Fetch by id and reject after inspecting the record. This can disclose existence timing and is easier to bypass in future paths.

5. Validate root relationships within the same partition.

   Rationale: Cats can reference locations. A cat operation must only accept locations with matching `isTest` and usable status, otherwise test and regular data can become connected even if list filters are correct.

   Alternative considered: Rely on frontend location lists to prevent invalid relationships. Backend enforcement is required because API clients can submit arbitrary identifiers.

6. Keep child records scoped through their parent root entity instead of adding independent flags immediately.

   Rationale: Cat photos, weights, audit events, and tag assignments are reachable through a cat. Enforcing the cat partition before child operations satisfies the isolation requirement without redundant columns.

   Alternative considered: Add `isTest` to every dependent table. This creates synchronization risk unless there is a clear query path that must read child records without first scoping through the parent.

## Risks / Trade-offs

- Root entity endpoints missed during implementation -> Add integration tests that exercise create, list, detail, update, and relationship validation for both test and regular users.
- Unique constraints remain global across partitions -> Decide during implementation whether names/microchips/passports must remain globally unique or can duplicate across partitions. Preserve global uniqueness unless acceptance tests show partition-local uniqueness is required.
- Authenticated user context may be incomplete in tests -> Update test helpers and session-auth fixtures to include `isTest` consistently.
- Existing frontend types may not use the new field -> Include `isTest` in API types where root entities are returned, but avoid UI changes unless existing displays depend on exhaustive typing.

## Migration Plan

1. Add nullable/defaulted `isTest` columns for `Location` and `Cat`, backfilled to `false`, then enforce non-null defaults.
2. Regenerate Prisma client and update backend request user types to include `isTest`.
3. Update cat and location service/controller signatures to pass and enforce the current user's test status.
4. Update tests and fixtures for both user partitions.
5. Rollback by removing service filters and dropping the new columns only if no test-partitioned data needs preservation.
