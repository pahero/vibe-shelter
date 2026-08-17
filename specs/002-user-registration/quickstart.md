# Quickstart: User Registration Validation

## Prerequisites

- PostgreSQL/testcontainers prerequisites available for backend tests.
- Project dependencies installed for `backend/` and `frontend/`.
- A migrated development or test database when running the application manually.

## Backend Validation

Run backend tests from `backend/` after implementation:

```powershell
npm run test
```

Expected outcomes:

- Creating a user with `email`, `password`, and `isTest: true` succeeds and stores the marker.
- Creating a user with `email`, `password`, and `isTest: false` succeeds and stores the marker.
- Creating a user without `password` fails and no user is created.
- Creating a user with blank `password` fails and no user is created.
- Creating a user without `isTest` fails and no user is created.
- Creating a duplicate user fails without changing the existing user.
- User responses include `isTest` and never include `passwordHash`.
- Test users and non-test users follow the same password-login behavior.

Run database-backed tests when schema and persistence behavior changes:

```powershell
npm run test:db
```

Expected outcome: transaction-isolated tests pass repeatedly without depending on shared users or execution order.

## Frontend Validation

If frontend registration UI is implemented or changed, run from `frontend/`:

```powershell
npm run test
npm run test:components
```

Expected outcomes:

- Registration form requires a password.
- Registration form requires an explicit test-user yes/no value.
- Submitted payload includes boolean `isTest`.
- Validation messages identify missing password or missing marker.
- Displayed user metadata shows whether the user is a test user.

## Manual End-to-End Scenario

1. Start the application from the repository root:

   ```powershell
   .\run.ps1
   ```

2. Sign in as an admin user.

3. Open the admin user-management registration flow.

4. Attempt to create a user without a password.

   Expected: creation is rejected and no user appears in the user list.

5. Attempt to create a user without selecting whether the user is a test user.

   Expected: creation is rejected and no user appears in the user list.

6. Create a user with a password and select `Test user`.

   Expected: creation succeeds and the user is displayed as a test user.

7. Create a second user with a password and select `Not a test user`.

   Expected: creation succeeds and the user is displayed as not a test user.

8. Sign in as a test user with valid credentials if the user is active.

   Expected: login behavior is identical to a non-test user with the same role and status.

## Contract References

- Backend contract: [contracts/api-contract.md](./contracts/api-contract.md)
- UI contract: [contracts/ui-contract.md](./contracts/ui-contract.md)
- Data model: [data-model.md](./data-model.md)
