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

**Purpose**: Confirm current backend and frontend registration surfaces before changing implementation.

- [ ] T001 Verify current admin user creation DTO, controller, and service behavior in `backend/src/auth/dto/index.ts`, `backend/src/admin/admin.controller.ts`, and `backend/src/users/users.service.ts`
- [ ] T002 [P] Verify existing user schema and migration history in `backend/prisma/schema.prisma` and `backend/prisma/migrations/`
- [ ] T003 [P] Verify existing frontend auth, navigation, route-guard, and component-test patterns in `frontend/src/lib/backend.ts`, `frontend/src/components/app-header.tsx`, `frontend/src/app/edit-shelter/page.tsx`, and `frontend/src/components/app-header.test.tsx`
- [ ] T004 [P] Review the applicable Next.js 16 server component, route, and form guidance in `frontend/node_modules/next/dist/docs/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add shared data, contract, and type foundations needed by every user story.

**CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Add `isTest Boolean @default(false)` to the User model in `backend/prisma/schema.prisma`
- [ ] T006 Create migration SQL adding non-null `isTest` with default false in `backend/prisma/migrations/20260817000000_add_user_is_test_marker/migration.sql`
- [ ] T007 Regenerate or verify Prisma client compatibility for User `isTest` access from `backend/prisma/schema.prisma`
- [ ] T008 Add shared frontend admin user request and response types including `isTest` in `frontend/src/lib/backend.ts`
- [ ] T009 Add admin users navigation target planning by reserving `/admin/users` route usage in `frontend/src/components/app-header.tsx`

**Checkpoint**: Database, backend DTO direction, and frontend user types can represent test and non-test users without changing existing account behavior.

---

## Phase 3: User Story 1 - Register a User With Required Credentials (Priority: P1) MVP

**Goal**: An authorized admin can create a user with identifying details, a password, and an explicit test-user marker, while the current user list is visible with the registration form and refreshes after creation.

**Independent Test**: Submit valid admin user creation payloads with `isTest: true` and `isTest: false`, then confirm both users are created, responses exclude password data, and the frontend registration experience shows the form and refreshed user list together.

### Tests for User Story 1

- [ ] T010 [P] [US1] Add database service tests for successful user creation with `isTest: true` and `isTest: false` in `backend/src/users/users.service.db.spec.ts`
- [ ] T011 [P] [US1] Add admin endpoint integration tests for successful `POST /admin/users` and `GET /admin/users` responses including `isTest` and excluding password data in `backend/src/test/integration/admin-users.integration.spec.ts`
- [ ] T012 [P] [US1] Add component test verifying the admin registration form and current user list render together in `frontend/src/components/user-registration-client.test.tsx`
- [ ] T013 [P] [US1] Add component test verifying successful registration submits `isTest` and updates the colocated user list in `frontend/src/components/user-registration-client.test.tsx`
- [ ] T014 [P] [US1] Add route or page test verifying non-admin users cannot access the admin users registration route in `frontend/src/app/admin/users/page.test.tsx`

### Implementation for User Story 1

- [ ] T015 [US1] Add required `isTest` request and response fields to `CreateUserDto` and `UserResponseDto` in `backend/src/auth/dto/index.ts`
- [ ] T016 [US1] Persist `isTest` and include it in `mapToDto` output in `backend/src/users/users.service.ts`
- [ ] T017 [US1] Include `isTest` in admin user creation, list, detail, and update responses in `backend/src/admin/admin.controller.ts`
- [ ] T018 [US1] Include `isTest` in authenticated user list and detail responses in `backend/src/users/users.controller.ts`
- [ ] T019 [US1] Implement `fetchAdminUsers` and `createAdminUser` helpers that call `GET /admin/users` and `POST /admin/users` with cookies/credentials in `frontend/src/lib/backend.ts`
- [ ] T020 [US1] Create the admin user registration route with admin-only redirect behavior and initial user-list loading in `frontend/src/app/admin/users/page.tsx`
- [ ] T021 [US1] Create the combined registration form and user-list client component in `frontend/src/components/user-registration-client.tsx`
- [ ] T022 [US1] Add an admin navigation link to the user registration experience in `frontend/src/components/app-header.tsx`
- [ ] T023 [US1] Update app header component tests for the admin user registration navigation link in `frontend/src/components/app-header.test.tsx`

**Checkpoint**: User Story 1 is independently functional through the admin API and a frontend admin experience that displays the user list with the registration form.

---

## Phase 4: User Story 2 - Prevent Registration Without a Password (Priority: P2)

**Goal**: Registration fails when the password is missing, empty, or blank, and no user is created.

**Independent Test**: Attempt admin user creation without a password and with blank password values through the API and frontend form; confirm validation errors and no persisted or displayed user records.

### Tests for User Story 2

- [ ] T024 [P] [US2] Add database service tests rejecting missing, empty, and blank registration passwords in `backend/src/users/users.service.db.spec.ts`
- [ ] T025 [P] [US2] Add admin endpoint integration tests rejecting missing and blank `password` in `backend/src/test/integration/admin-users.integration.spec.ts`
- [ ] T026 [P] [US2] Add component test verifying missing or blank password shows field-specific validation and does not call creation API in `frontend/src/components/user-registration-client.test.tsx`

### Implementation for User Story 2

- [ ] T027 [US2] Make `password` required for `CreateUserDto` while keeping `UpdateUserDto.password` optional in `backend/src/auth/dto/index.ts`
- [ ] T028 [US2] Add service-level guard that rejects missing or blank creation passwords before persistence in `backend/src/users/users.service.ts`
- [ ] T029 [US2] Add frontend password validation and safe form-state preservation after validation failures in `frontend/src/components/user-registration-client.tsx`

**Checkpoint**: User Story 2 blocks incomplete password registrations without partial user creation or list changes.

---

## Phase 5: User Story 3 - Identify Test Users (Priority: P3)

**Goal**: Operators and downstream consumers can distinguish test and non-test users, while marker value remains informational only.

**Independent Test**: Register one test user and one non-test user, list or fetch them, and confirm the marker is preserved and visible without changing login behavior.

### Tests for User Story 3

- [ ] T030 [P] [US3] Add database service tests confirming duplicate user registration leaves the existing `isTest` marker unchanged in `backend/src/users/users.service.db.spec.ts`
- [ ] T031 [P] [US3] Add authentication tests confirming active test and non-test users follow identical password login behavior in `backend/src/auth/auth.service.db.spec.ts`
- [ ] T032 [P] [US3] Add admin/user endpoint integration tests confirming list and detail responses include `isTest` in `backend/src/test/integration/admin-users.integration.spec.ts`
- [ ] T033 [P] [US3] Add component test verifying listed users display test and non-test marker labels in `frontend/src/components/user-registration-client.test.tsx`

### Implementation for User Story 3

- [ ] T034 [US3] Ensure duplicate user creation maps to the existing duplicate-error behavior without changing existing user data in `backend/src/users/users.service.ts`
- [ ] T035 [US3] Ensure password authentication ignores `isTest` and preserves current status, role, and password checks in `backend/src/auth/auth.service.ts`
- [ ] T036 [US3] Render clear test-user and non-test-user labels in the colocated user list in `frontend/src/components/user-registration-client.tsx`
- [ ] T037 [US3] Update backend API documentation for `isTest` request and response fields in `backend/API.md`

**Checkpoint**: User Story 3 makes the marker visible and proves it has no account-behavior side effects.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete validation, documentation consistency, and generated task closure.

- [ ] T038 [P] Update seed/admin user data to set an explicit `isTest` value in `backend/prisma/seed.ts`
- [ ] T039 [P] Update frontend quick references or inline empty-state copy for admin user registration in `frontend/src/components/user-registration-client.tsx`
- [ ] T040 Run backend unit and database validation commands from `specs/002-user-registration/quickstart.md` using `backend/package.json`
- [ ] T041 Run frontend type and component validation commands from `specs/002-user-registration/quickstart.md` using `frontend/package.json`
- [ ] T042 Run or update manual/E2E validation for the combined registration form and user list workflow in `integration-tests/tests/web/auth-ui.spec.ts`
- [ ] T043 Verify quickstart expected outcomes against implementation in `specs/002-user-registration/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup completion and blocks all user stories.
- User Story 1 (Phase 3) depends on Foundational completion and is the MVP.
- User Story 2 (Phase 4) depends on User Story 1 DTO/service/form paths because it tightens registration validation.
- User Story 3 (Phase 5) depends on User Story 1 response marker support and displayed list support.
- Polish (Phase 6) depends on all selected user stories.

### User Story Dependencies

- **US1 Register a User With Required Credentials**: Starts after Phase 2; no dependency on US2 or US3.
- **US2 Prevent Registration Without a Password**: Starts after US1 establishes the creation path; independently testable through negative API and UI registration attempts.
- **US3 Identify Test Users**: Starts after US1 exposes marker persistence and responses; independently testable through read/login behavior and UI list labels.

### Within Each User Story

- Tests must be written first and observed failing before implementation.
- DTO/schema tasks precede service persistence tasks.
- Service persistence tasks precede controller response tasks.
- Frontend API helper tasks precede route and client component integration tasks.
- Endpoint and component tests validate observable contracts and UI behavior.

## Parallel Opportunities

- T002, T003, and T004 can run in parallel after T001 starts because they inspect different areas.
- T010, T011, T012, T013, and T014 can be written in parallel because they target service DB tests, endpoint integration tests, component tests, and route tests.
- T024, T025, and T026 can be written in parallel because they target different validation layers.
- T030, T031, T032, and T033 can be written in parallel because they target users service, auth service, endpoint integration behavior, and frontend display behavior.
- T038 and T039 can run in parallel after core implementation is stable because they touch separate backend seed and frontend copy files.

## Parallel Example: User Story 1

```text
Task: "T010 [P] [US1] Add database service tests for successful user creation with `isTest: true` and `isTest: false` in `backend/src/users/users.service.db.spec.ts`"
Task: "T011 [P] [US1] Add admin endpoint integration tests for successful `POST /admin/users` and `GET /admin/users` responses including `isTest` and excluding password data in `backend/src/test/integration/admin-users.integration.spec.ts`"
Task: "T012 [P] [US1] Add component test verifying the admin registration form and current user list render together in `frontend/src/components/user-registration-client.test.tsx`"
Task: "T014 [P] [US1] Add route or page test verifying non-admin users cannot access the admin users registration route in `frontend/src/app/admin/users/page.test.tsx`"
```

## Parallel Example: User Story 2

```text
Task: "T024 [P] [US2] Add database service tests rejecting missing, empty, and blank registration passwords in `backend/src/users/users.service.db.spec.ts`"
Task: "T025 [P] [US2] Add admin endpoint integration tests rejecting missing and blank `password` in `backend/src/test/integration/admin-users.integration.spec.ts`"
Task: "T026 [P] [US2] Add component test verifying missing or blank password shows field-specific validation and does not call creation API in `frontend/src/components/user-registration-client.test.tsx`"
```

## Parallel Example: User Story 3

```text
Task: "T030 [P] [US3] Add database service tests confirming duplicate user registration leaves the existing `isTest` marker unchanged in `backend/src/users/users.service.db.spec.ts`"
Task: "T031 [P] [US3] Add authentication tests confirming active test and non-test users follow identical password login behavior in `backend/src/auth/auth.service.db.spec.ts`"
Task: "T032 [P] [US3] Add admin/user endpoint integration tests confirming list and detail responses include `isTest` in `backend/src/test/integration/admin-users.integration.spec.ts`"
Task: "T033 [P] [US3] Add component test verifying listed users display test and non-test marker labels in `frontend/src/components/user-registration-client.test.tsx`"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup checks.
2. Complete Phase 2 data, migration, and frontend type foundation.
3. Write and run failing US1 tests T010 through T014.
4. Complete US1 implementation tasks T015 through T023.
5. Validate US1 independently through backend service/integration tests and frontend component or route tests.

### Incremental Delivery

1. Deliver US1 to support successful registration with explicit marker and a colocated user list/form experience.
2. Add US2 to enforce password rejection behavior in backend and frontend validation.
3. Add US3 to prove marker visibility and no behavior side effects.
4. Run Phase 6 validation before marking implementation complete.

### Notes

- Keep tests isolated with unique user emails and no shared mutable frontend fixtures.
- Do not return `password`, `passwordHash`, or password-derived data in any backend or frontend user object.
- Mark each task `[X]` in this file immediately after completing and validating it.
