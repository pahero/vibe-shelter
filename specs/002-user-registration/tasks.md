# Tasks: User Registration

**Input**: Design documents from `/specs/002-user-registration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required by the feature specification and Vibe Shelter Constitution. Write test tasks first and verify they fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on another incomplete task
- **[Story]**: User story label for story-phase tasks only
- **File paths**: Every task includes exact project-relative file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm current backend registration surface and prepare implementation targets.

- [X] T001 Verify current admin user creation DTO, controller, and service behavior in `backend/src/auth/dto/index.ts`, `backend/src/admin/admin.controller.ts`, and `backend/src/users/users.service.ts`
- [X] T002 [P] Verify existing user schema and migration history in `backend/prisma/schema.prisma` and `backend/prisma/migrations/`
- [X] T003 [P] Verify existing backend test helpers and integration-test auth patterns in `backend/src/users/users.service.db.spec.ts` and `backend/src/test/integration/cats.integration.spec.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the persisted marker foundation needed by every user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Add `isTest Boolean @default(false)` to the User model in `backend/prisma/schema.prisma`
- [X] T005 Create migration SQL adding non-null `isTest` with default false in `backend/prisma/migrations/20260817000000_add_user_is_test_marker/migration.sql`
- [X] T006 Regenerate or verify Prisma client compatibility for User `isTest` access from `backend/prisma/schema.prisma`

**Checkpoint**: Database can represent test and non-test users without changing existing account behavior.

---

## Phase 3: User Story 1 - Register a User With Required Credentials (Priority: P1) MVP

**Goal**: An authorized admin can create a user with identifying details, a password, and an explicit test-user marker, and the created user response confirms the marker.

**Independent Test**: Submit valid admin user creation payloads with `isTest: true` and `isTest: false`, then confirm both users are created with password hashes and marker values.

### Tests for User Story 1

- [X] T007 [P] [US1] Add database service tests for successful user creation with `isTest: true` and `isTest: false` in `backend/src/users/users.service.db.spec.ts`
- [X] T008 [P] [US1] Add admin endpoint integration test for successful `POST /api/admin/users` returning `isTest` and excluding password data in `backend/src/test/integration/admin-users.integration.spec.ts`

### Implementation for User Story 1

- [X] T009 [US1] Add required `isTest` request and response fields to `CreateUserDto` and `UserResponseDto` in `backend/src/auth/dto/index.ts`
- [X] T010 [US1] Persist `isTest` and include it in `mapToDto` output in `backend/src/users/users.service.ts`
- [X] T011 [US1] Include `isTest` in admin user creation, list, detail, and update responses in `backend/src/admin/admin.controller.ts`
- [X] T012 [US1] Include `isTest` in authenticated user list and detail responses in `backend/src/users/users.controller.ts`

**Checkpoint**: User Story 1 is independently functional through the admin API and service layer.

---

## Phase 4: User Story 2 - Prevent Registration Without a Password (Priority: P2)

**Goal**: Registration fails when the password is missing, empty, or blank, and no user is created.

**Independent Test**: Attempt admin user creation without a password and with blank password values; confirm validation errors and no persisted user records.

### Tests for User Story 2

- [X] T013 [P] [US2] Add database service tests rejecting missing, empty, and blank registration passwords in `backend/src/users/users.service.db.spec.ts`
- [X] T014 [P] [US2] Add admin endpoint integration tests rejecting missing and blank `password` in `backend/src/test/integration/admin-users.integration.spec.ts`

### Implementation for User Story 2

- [X] T015 [US2] Make `password` required for `CreateUserDto` while keeping `UpdateUserDto.password` optional in `backend/src/auth/dto/index.ts`
- [X] T016 [US2] Add service-level guard that rejects missing or blank creation passwords before persistence in `backend/src/users/users.service.ts`

**Checkpoint**: User Story 2 blocks incomplete password registrations without partial user creation.

---

## Phase 5: User Story 3 - Identify Test Users (Priority: P3)

**Goal**: Operators and downstream consumers can distinguish test and non-test users, while marker value remains informational only.

**Independent Test**: Register one test user and one non-test user, list or fetch them, and confirm the marker is preserved without changing login behavior.

### Tests for User Story 3

- [X] T017 [P] [US3] Add database service tests confirming duplicate user registration leaves the existing `isTest` marker unchanged in `backend/src/users/users.service.db.spec.ts`
- [X] T018 [P] [US3] Add authentication tests confirming active test and non-test users follow identical password login behavior in `backend/src/auth/auth.service.db.spec.ts`
- [X] T019 [P] [US3] Add admin/user endpoint integration tests confirming list and detail responses include `isTest` in `backend/src/test/integration/admin-users.integration.spec.ts`

### Implementation for User Story 3

- [X] T020 [US3] Ensure duplicate user creation maps to the existing duplicate-error behavior without changing existing user data in `backend/src/users/users.service.ts`
- [X] T021 [US3] Ensure password authentication ignores `isTest` and preserves current status, role, and password checks in `backend/src/auth/auth.service.ts`
- [X] T022 [US3] Update backend API documentation for `isTest` request and response fields in `backend/API.md`

**Checkpoint**: User Story 3 makes the marker visible and proves it has no account-behavior side effects.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete validation, documentation consistency, and generated task closure.

- [X] T023 [P] Update seed/admin user data to set an explicit `isTest` value in `backend/prisma/seed.ts`
- [X] T024 Run backend unit and database validation commands from quickstart in `backend/package.json`
- [X] T025 Run backend integration validation for admin user registration in `backend/src/test/integration/admin-users.integration.spec.ts`
- [X] T026 Verify quickstart backend expected outcomes against implementation in `specs/002-user-registration/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup completion and blocks all user stories.
- User Story 1 (Phase 3) depends on Foundational completion and is the MVP.
- User Story 2 (Phase 4) depends on User Story 1 DTO/service paths because it tightens registration validation.
- User Story 3 (Phase 5) depends on User Story 1 response marker support.
- Polish (Phase 6) depends on all selected user stories.

### User Story Dependencies

- **US1 Register a User With Required Credentials**: Starts after Phase 2; no dependency on US2 or US3.
- **US2 Prevent Registration Without a Password**: Starts after US1 establishes the creation path; independently testable through negative registration attempts.
- **US3 Identify Test Users**: Starts after US1 exposes marker persistence and responses; independently testable through read/login behavior.

### Within Each User Story

- Tests must be written first and observed failing before implementation.
- DTO/schema tasks precede service persistence tasks.
- Service persistence tasks precede controller response tasks.
- Endpoint integration tests validate controller wiring and response contracts.

## Parallel Opportunities

- T002 and T003 can run in parallel after T001 starts because they inspect different areas.
- T007 and T008 can be written in parallel because they target service DB tests and endpoint integration tests.
- T013 and T014 can be written in parallel because they target different validation layers.
- T017, T018, and T019 can be written in parallel because they target users service, auth service, and endpoint integration behavior.
- T023 can run in parallel with documentation review after core implementation is stable.

## Parallel Example: User Story 1

```text
Task: "T007 [P] [US1] Add database service tests for successful user creation with `isTest: true` and `isTest: false` in `backend/src/users/users.service.db.spec.ts`"
Task: "T008 [P] [US1] Add admin endpoint integration test for successful `POST /api/admin/users` returning `isTest` and excluding password data in `backend/src/test/integration/admin-users.integration.spec.ts`"
```

## Parallel Example: User Story 2

```text
Task: "T013 [P] [US2] Add database service tests rejecting missing, empty, and blank registration passwords in `backend/src/users/users.service.db.spec.ts`"
Task: "T014 [P] [US2] Add admin endpoint integration tests rejecting missing and blank `password` in `backend/src/test/integration/admin-users.integration.spec.ts`"
```

## Parallel Example: User Story 3

```text
Task: "T017 [P] [US3] Add database service tests confirming duplicate user registration leaves the existing `isTest` marker unchanged in `backend/src/users/users.service.db.spec.ts`"
Task: "T018 [P] [US3] Add authentication tests confirming active test and non-test users follow identical password login behavior in `backend/src/auth/auth.service.db.spec.ts`"
Task: "T019 [P] [US3] Add admin/user endpoint integration tests confirming list and detail responses include `isTest` in `backend/src/test/integration/admin-users.integration.spec.ts`"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup checks.
2. Complete Phase 2 database marker foundation.
3. Write and run failing US1 tests T007 and T008.
4. Complete US1 implementation tasks T009 through T012.
5. Validate US1 independently through service tests and `POST /api/admin/users` integration behavior.

### Incremental Delivery

1. Deliver US1 to support successful registration with explicit marker.
2. Add US2 to enforce password rejection behavior.
3. Add US3 to prove marker visibility and no behavior side effects.
4. Run Phase 6 validation before marking implementation complete.

### Notes

- No frontend tasks are included because no existing frontend admin user-registration screen was found during planning; backend API contracts are the executable registration surface for this task list.
- If a frontend admin registration screen is added later, generate frontend tasks from `specs/002-user-registration/contracts/ui-contract.md`.
- Mark each task `[X]` in this file immediately after completing and validating it.
