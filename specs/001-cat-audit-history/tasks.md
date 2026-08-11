# Tasks: Cat Audit History

**Input**: Design documents from `/specs/001-cat-audit-history/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by FR-016, FR-017, and the project constitution. Test tasks appear before implementation tasks in each user story.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on incomplete tasks
- **[Story]**: Maps task to a user story from `spec.md`
- All task descriptions include exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared audit file structure and generated artifacts for implementation.

- [X] T001 Create cat audit query barrel in `backend/src/cats/queries/index.ts`
- [X] T002 Create cat audit command barrel in `backend/src/cats/commands/index.ts`
- [X] T003 [P] Create cat audit frontend component test shell in `frontend/src/components/cat-history.test.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, shared types, and reusable audit plumbing that MUST complete before user stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Add `CatAuditEventType`, cat creator fields, cat photo actor/deletion fields, and `CatAuditEvent` model in `backend/prisma/schema.prisma`
- [X] T005 Create migration SQL for cat audit schema in `backend/prisma/migrations/20260810000000_cat_audit_history/migration.sql`
- [X] T006 [P] Define granular audit event constants and editable-field mapping in `backend/src/cats/cat-audit-event-types.ts`
- [X] T007 [P] Define cat history response DTOs with `oldValue`, `newValue`, and `photo.link` in `backend/src/cats/dto/cat-history.dto.ts`
- [X] T008 [P] Define audit value formatting helper in `backend/src/cats/cat-audit-values.ts`
- [X] T009 Create transaction-safe cat audit writer in `backend/src/cats/commands/write-cat-audit-event.command.ts`
- [X] T010 Register shared cat audit providers in `backend/src/cats/cats.module.ts`
- [X] T011 [P] Add frontend `CatHistoryEvent` and `CatHistoryResponse` types in `frontend/src/lib/api.ts`

**Checkpoint**: Audit schema, shared DTOs, and reusable audit plumbing are ready.

---

## Phase 3: User Story 1 - View Cat Change History (Priority: P1) MVP

**Goal**: Staff can open a cat history view and see typed field-change audit entries showing actor, time, old value, and new value.

**Independent Test**: Update a cat name and another editable field, open the cat history tab, and confirm separate typed events with old/new values and actor.

### Tests for User Story 1

- [X] T012 [P] [US1] Add DB unit tests for granular field-change audit events in `backend/src/cats/cats.service.spec.ts`
- [X] T013 [P] [US1] Add endpoint integration tests for `GET /api/cats/:id/history` field-change responses in `backend/src/test/integration/cats.integration.spec.ts`
- [X] T014 [P] [US1] Add frontend component tests for populated cat field history rendering in `frontend/src/components/cat-history.test.tsx`

### Implementation for User Story 1

- [X] T015 [US1] Pass authenticated actor from `@CurrentUser()` into `PATCH /api/cats/:id` in `backend/src/cats/cats.controller.ts`
- [X] T016 [US1] Update `CatsService.updateCat` to accept actor user ID and write one `CatAuditEvent` per changed field in `backend/src/cats/cats.service.ts`
- [X] T017 [US1] Create cat history query handler in `backend/src/cats/queries/list-cat-history.query.ts`
- [X] T018 [US1] Add `GET /api/cats/:id/history` endpoint in `backend/src/cats/cats.controller.ts`
- [X] T019 [US1] Map audit events to API contract response shape in `backend/src/cats/queries/list-cat-history.query.ts`
- [X] T020 [US1] Add `catsApi.listHistory` client method in `frontend/src/lib/api.ts`
- [X] T021 [US1] Implement reusable history renderer in `frontend/src/components/cat-history.tsx`
- [X] T022 [US1] Render cat history section on the cat profile page in `frontend/src/app/cats/[id]/page.tsx`

**Checkpoint**: User Story 1 is independently functional and testable as the MVP.

---

## Phase 4: User Story 2 - Attribute Cat Creation to a User (Priority: P2)

**Goal**: Each created cat stores the authenticated creator user ID and later updates cannot change it.

**Independent Test**: Create a cat as an authenticated user and confirm the saved cat has that creator ID; update the cat as another user and confirm the creator ID is unchanged.

### Tests for User Story 2

- [X] T023 [P] [US2] Add create-cat handler tests for persisted `createdByUserId` in `backend/src/cats/commands/create-cat.handler.spec.ts`
- [X] T024 [P] [US2] Add endpoint integration tests for create attribution immutability in `backend/src/test/integration/cats.integration.spec.ts`

### Implementation for User Story 2

- [X] T025 [US2] Add creator user ID to `CreateCatCommand` in `backend/src/cats/commands/create-cat.command.ts`
- [X] T026 [US2] Pass authenticated actor from `@CurrentUser()` into `POST /api/cats` in `backend/src/cats/cats.controller.ts`
- [X] T027 [US2] Persist `createdByUserId` during cat creation in `backend/src/cats/commands/create-cat.handler.ts`
- [X] T028 [US2] Exclude `createdByUserId` from cat update payload handling in `backend/src/cats/dto/update-cat.dto.ts`
- [X] T029 [US2] Include creator attribution in cat card data when needed for verification in `backend/src/cats/cats.service.ts`

**Checkpoint**: User Story 2 is independently functional and does not depend on later photo work.

---

## Phase 5: User Story 3 - Preserve Complete Audit Trail (Priority: P3)

**Goal**: Successful changed-field updates are complete and chronological; no-op and failed updates create no audit events.

**Independent Test**: Perform multiple successful, no-op, and failed updates by different users and verify only successful changed-field events appear newest-first with correct actors.

### Tests for User Story 3

- [X] T030 [P] [US3] Add DB unit tests for no-op and failed update audit suppression in `backend/src/cats/cats.service.spec.ts`
- [X] T031 [P] [US3] Add endpoint integration tests for multi-user chronological history ordering in `backend/src/test/integration/cats.integration.spec.ts`
- [X] T032 [P] [US3] Add frontend tests for empty, loading, and error history states in `frontend/src/components/cat-history.test.tsx`

### Implementation for User Story 3

- [X] T033 [US3] Ensure `CatsService.updateCat` compares normalized old/new values before writing audit events in `backend/src/cats/cats.service.ts`
- [X] T034 [US3] Wrap cat update and audit event writes in one transaction in `backend/src/cats/cats.service.ts`
- [X] T035 [US3] Enforce newest-first ordering and pagination limits in `backend/src/cats/queries/list-cat-history.query.ts`
- [X] T036 [US3] Preserve actor display fallback for inactive users in `backend/src/cats/queries/list-cat-history.query.ts`
- [X] T037 [US3] Implement history loading, empty, and error UI states in `frontend/src/components/cat-history.tsx`
- [X] T038 [US3] Refresh cat history after successful detail save in `frontend/src/app/cats/[id]/page.tsx`

**Checkpoint**: User Story 3 is independently functional and confirms audit trail correctness under edge cases.

---

## Phase 6: User Story 4 - Audit Cat Photo Changes (Priority: P3)

**Goal**: Staff can see who added and deleted cat photos, and every photo audit entry includes a link, including deleted photos.

**Independent Test**: Add and delete a cat photo as authenticated users, open history, and confirm `photo_created` and `photo_deleted` entries include actor, time, event type, and `photo.link`.

### Tests for User Story 4

- [X] T039 [P] [US4] Add DB unit tests for photo-created and photo-deleted audit events in `backend/src/cats/cats.service.spec.ts`
- [X] T040 [P] [US4] Add endpoint integration tests for photo history links and active-gallery exclusion in `backend/src/test/integration/cats.integration.spec.ts`
- [X] T041 [P] [US4] Add frontend tests for photo-created and photo-deleted history rendering in `frontend/src/components/cat-history.test.tsx`

### Implementation for User Story 4

- [X] T042 [US4] Pass authenticated actor from `@CurrentUser()` into photo add/delete endpoints in `backend/src/cats/cats.controller.ts`
- [X] T043 [US4] Update `CatsService.addPhoto` to persist `createdByUserId` and write `photo_created` audit events in `backend/src/cats/cats.service.ts`
- [X] T044 [US4] Update `CatsService.deletePhoto` to soft-delete photo metadata with `deletedByUserId` and `deletedAt` in `backend/src/cats/cats.service.ts`
- [X] T045 [US4] Update `CatsService.deletePhoto` to write `photo_deleted` audit events with `photoId` in `backend/src/cats/cats.service.ts`
- [X] T046 [US4] Update `CatsService.listPhotos` to exclude deleted photos from active gallery responses in `backend/src/cats/cats.service.ts`
- [X] T047 [US4] Resolve `photo.link` for `photo_created` and `photo_deleted` history entries in `backend/src/cats/queries/list-cat-history.query.ts`
- [X] T048 [US4] Render photo-created and photo-deleted history entries with links in `frontend/src/components/cat-history.tsx`
- [X] T049 [US4] Refresh cat history after successful photo add/delete actions in `frontend/src/app/cats/[id]/page.tsx`

**Checkpoint**: User Story 4 is independently functional and confirms all photo audit operations expose links.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, cleanup, and documentation updates across all stories.

- [X] T050 [P] Update backend OpenAPI or controller response documentation for history endpoint in `backend/src/cats/cats.controller.ts`
- [X] T051 [P] Update frontend API type exports for history consumers in `frontend/src/lib/api.ts`
- [X] T052 [P] Review cat audit implementation notes against `specs/001-cat-audit-history/contracts/api-contract.md`
- [X] T053 Run backend unit and integration validation from `backend/package.json`
- [X] T054 Run frontend type and component validation from `frontend/package.json`
- [X] T055 Run quickstart validation scenarios from `specs/001-cat-audit-history/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; suggested MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational; can run after or in parallel with US1 if files are coordinated.
- **User Story 3 (Phase 5)**: Depends on Foundational and benefits from US1 history endpoint work.
- **User Story 4 (Phase 6)**: Depends on Foundational and benefits from US1 history endpoint work.
- **Polish (Phase 7)**: Depends on desired user stories being complete.

### User Story Dependencies

- **US1 View Cat Change History (P1)**: Earliest complete MVP after Foundation.
- **US2 Attribute Cat Creation (P2)**: Independent of photo auditing; can be implemented after Foundation.
- **US3 Preserve Complete Audit Trail (P3)**: Extends US1 behavior for no-op, failed, and ordering cases.
- **US4 Audit Cat Photo Changes (P3)**: Extends the history stream with photo event types and links.

### Within Each User Story

- Tests MUST be written and fail before implementation.
- Schema and shared audit writer precede story implementation.
- Backend behavior precedes frontend integration.
- Each story checkpoint must pass before treating that story as complete.

---

## Parallel Examples

### User Story 1

```powershell
# Parallel test authoring for US1
Task: "T012 [US1] Add DB unit tests in backend/src/cats/cats.service.spec.ts"
Task: "T013 [US1] Add endpoint integration tests in backend/src/test/integration/cats.integration.spec.ts"
Task: "T014 [US1] Add frontend component tests in frontend/src/components/cat-history.test.tsx"

# Parallel frontend/backend work after API shape is agreed
Task: "T019 [US1] Map audit events in backend/src/cats/queries/list-cat-history.query.ts"
Task: "T021 [US1] Implement renderer in frontend/src/components/cat-history.tsx"
```

### User Story 2

```powershell
# Parallel test authoring for US2
Task: "T023 [US2] Add create-cat handler tests in backend/src/cats/commands/create-cat.handler.spec.ts"
Task: "T024 [US2] Add endpoint integration tests in backend/src/test/integration/cats.integration.spec.ts"
```

### User Story 3

```powershell
# Parallel test authoring for US3
Task: "T030 [US3] Add no-op/failed update unit tests in backend/src/cats/cats.service.spec.ts"
Task: "T031 [US3] Add chronological integration tests in backend/src/test/integration/cats.integration.spec.ts"
Task: "T032 [US3] Add UI state tests in frontend/src/components/cat-history.test.tsx"
```

### User Story 4

```powershell
# Parallel test authoring for US4
Task: "T039 [US4] Add photo audit unit tests in backend/src/cats/cats.service.spec.ts"
Task: "T040 [US4] Add photo history integration tests in backend/src/test/integration/cats.integration.spec.ts"
Task: "T041 [US4] Add photo history UI tests in frontend/src/components/cat-history.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational audit schema and shared plumbing.
3. Complete Phase 3: User Story 1.
4. Stop and validate cat field-change history independently.
5. Demo history tab with name and field changes before continuing.

### Incremental Delivery

1. Add User Story 1 for MVP history visibility.
2. Add User Story 2 for cat creator attribution.
3. Add User Story 3 for audit completeness and edge cases.
4. Add User Story 4 for photo event auditing and photo links.
5. Run Phase 7 validation after each desired release slice.

### Parallel Team Strategy

1. One developer completes database schema and audit writer tasks T004-T010.
2. Backend-focused developers split US1/US2/US3/US4 tests and handlers after Foundation.
3. Frontend-focused developer implements `frontend/src/components/cat-history.tsx` and page integration after `frontend/src/lib/api.ts` types are available.
4. Integration owner runs quickstart and resolves cross-story regressions.

## Notes

- [P] tasks are parallelizable only when assigned to different files or independent test files.
- All tests must use unique cats, users, and photos so they remain isolated and parallel-safe.
- No task should hard-delete photo metadata needed by history links.
- `CatAuditEvent` stores `oldValue` and `newValue` directly; do not create a separate `AuditFieldChange` entity.
- `photo.link` is returned by history responses but is derived from `photoId` and photo metadata; do not add `photoUrl` to `CatAuditEvent`.
