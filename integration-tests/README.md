# Integration tests (Playwright)

This folder is a standalone Playwright project for full-stack integration testing.

By default it reuses already running backend/frontend apps and runs separate test
projects in one command:
- `backend-api`: API integration checks against NestJS backend
- `frontend-ui-chromium`: browser checks against Next.js frontend (backed by real backend)

## Prerequisites

1. Install backend and frontend dependencies
2. Ensure backend database is ready and seeded (`admin@shelter.local` by default)

## Setup

```bash
cd integration-tests
npm install
npx playwright install chromium
```

## Run tests

```bash
npm test
```

Only backend API project:

```bash
npm run test:api
```

Only frontend UI project:

```bash
npm run test:web
```

## Environment variables

Optional values in `integration-tests/.env`:

- `BACKEND_URL` (default `http://localhost:4000`)
- `FRONTEND_URL` (default `http://localhost:4001`)
- `INTEGRATION_ADMIN_EMAIL` (default `admin@shelter.local`)
- `INTEGRATION_ADMIN_PASSWORD` (default `admin12345`)

## Test users (global setup)

Global setup uses two persistent, well-known test users that are registered
idempotently via the admin API and intentionally kept between runs:

- Staff: `e2e-staff@shelter.test` / `E2EStaffPass123!`
- Admin: `e2e-admin@shelter.test` / `E2EAdminPass123!`

Both are `isTest: true`, so the cats/locations they create are scoped to test
data and isolated from real records. Because they persist, individual specs can
also be launched on their own from the Playwright UI (`npx playwright test --ui`)
without first running the full suite — authentication always works.

Before the suite runs, `global-setup.ts` cleans up leftover `isTest` data
(cats/locations and ad hoc test users from previous runs) directly in the
database, then ensures the two test users exist and writes a small runtime state
file with the run id to `.test-runtime/test-env.json` (outside Playwright's
output dir so it survives when running single specs). `global-teardown.ts`
removes the run's test data again at the end.

Test data cleanup is performed with `pg` against the database (there is no
hard-delete endpoint for cats/locations). It uses
`DATABASE_URL` (default `postgresql://shelter_user:shelter_password@localhost:5435/shelter`).

All entities created by tests use a unique `e2e-<runId>` prefix
(`[e2e-<runId>] <name> <timestamp>-<random>`), so any created record is findable
on the first page of its list and never collides with existing data.

## Web server management

Default local behavior: Playwright does not start backend/frontend, so existing running apps are reused.

To let Playwright manage app startup (useful in CI), set:

- `MANAGE_WEB_SERVERS=1`

When enabled, Playwright starts backend (`npm run start:dev`) and frontend (`npm run dev`) before test execution.
