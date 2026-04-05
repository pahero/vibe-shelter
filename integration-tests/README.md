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

- `BACKEND_URL` (default `http://localhost:3000`)
- `FRONTEND_URL` (default `http://localhost:3001`)
- `INTEGRATION_ADMIN_EMAIL` (default `admin@shelter.local`)
- `INTEGRATION_ADMIN_PASSWORD` (default `admin12345`)

## Web server management

Default local behavior: Playwright does not start backend/frontend, so existing running apps are reused.

To let Playwright manage app startup (useful in CI), set:

- `MANAGE_WEB_SERVERS=1`

When enabled, Playwright starts backend (`npm run start:dev`) and frontend (`npm run dev`) before test execution.
