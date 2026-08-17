# Implementation Plan: User Registration

**Branch**: `002-user-registration` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-user-registration/spec.md`

## Summary

Extend existing admin user management so an authorized admin can register a user only when a password and explicit test-user marker are supplied. The implementation will add a stored `isTest` boolean marker to users, require `password` and `isTest` during admin user creation, return the marker in user responses, and expose the marker in frontend user registration controls while keeping authentication and account behavior unchanged.

## Technical Context

**Language/Version**: TypeScript 6.0.3 backend and TypeScript 6 frontend

**Primary Dependencies**: NestJS 11, Prisma 7, PostgreSQL, bcrypt, class-validator, Next.js 16, React 19

**Storage**: PostgreSQL through Prisma schema and migrations

**Testing**: Jest with Prisma/testcontainers for backend database behavior, Supertest for integration contracts, TypeScript checks and Vitest/Testing Library for frontend behavior where UI is changed

**Target Platform**: Web application with NestJS backend at `backend/` and Next.js frontend at `frontend/`

**Project Type**: Full-stack web application

**Performance Goals**: Authorized admins can complete registration in under 2 minutes; user creation remains a single interactive action under normal application latency

**Constraints**: Password must never be returned in user responses; test-user marker must not change login, permissions, status, or session behavior in this feature; validation errors must not create partial users

**Scale/Scope**: One existing admin user-management flow, one user data model extension, one backend contract update, and optional frontend registration form updates if the UI exposes admin user creation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Complete Test Coverage**: PASS. Plan requires automated tests for successful registration, missing password, missing marker, duplicate identity, response shape, and no behavior change for test users.
- **II. Test Isolation**: PASS. Backend database tests will use existing transaction rollback/test database utilities; integration test data will use unique emails per test.
- **III. Parallel-Safe Execution**: PASS. Tests must namespace unique user emails and avoid relying on shared seeded users except controlled authenticated admin fixtures.
- **IV. Behavior-Focused Tests**: PASS. Tests verify observable contracts and stored outcomes rather than implementation internals, except password hash non-disclosure and bcrypt comparison where security behavior requires evidence.
- **V. Continuous Verification**: PASS. Quickstart identifies local verification commands that must pass before implementation is complete.

Post-design re-check: PASS. Phase 1 artifacts include explicit backend/API/UI contracts and validation scenarios that preserve isolated, behavior-focused, parallel-safe tests.

## Project Structure

### Documentation (this feature)

```text
specs/002-user-registration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api-contract.md
│   └── ui-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── admin/
│   │   └── admin.controller.ts
│   ├── auth/
│   │   └── dto/
│   │       └── index.ts
│   └── users/
│       ├── users.service.ts
│       └── users.service.db.spec.ts
└── test/

frontend/
└── src/
    ├── app/
    ├── components/
    └── lib/

integration-tests/
```

**Structure Decision**: Use the existing full-stack web application structure. Backend user registration behavior belongs in the existing admin/users service and DTO path, with Prisma schema migration for persisted marker data. Frontend changes belong in the existing Next.js app only if an admin user creation screen exists or is introduced during implementation. Cross-process validation can be covered by backend integration tests and optional E2E tests if a UI workflow is implemented.

## Complexity Tracking

No constitution violations or exceptional complexity are required.
