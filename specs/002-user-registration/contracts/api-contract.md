# API Contract: User Registration

## Scope

This contract updates existing admin user-management responses and creation behavior. All admin endpoints require an authenticated admin session.

## POST /admin/users

Create a new registered user.

### Request Headers

```text
Cookie: shelter_session=<session_cookie>
Content-Type: application/json
```

### Request Body

```json
{
  "email": "newuser@example.com",
  "fullName": "Jane Smith",
  "role": "staff",
  "status": "active",
  "password": "SecurePass123",
  "isTest": false
}
```

### Request Rules

- `email` is required and must be unique.
- `password` is required for registration and must satisfy existing password validation.
- `isTest` is required and must be boolean.
- `fullName` is optional.
- `role` and `status` retain existing accepted values and defaults.

### Success Response: 201

```json
{
  "id": "new_user_id",
  "email": "newuser@example.com",
  "fullName": "Jane Smith",
  "status": "active",
  "role": "staff",
  "isTest": false,
  "lastLoginAt": null,
  "createdAt": "2026-08-17T10:30:00.000Z",
  "updatedAt": "2026-08-17T10:30:00.000Z"
}
```

### Error Responses

| Status | Condition | Expected Outcome |
|--------|-----------|------------------|
| 400 | Missing, empty, or invalid `password` | User is not created; response identifies password correction |
| 400 | Missing or non-boolean `isTest` | User is not created; response identifies marker correction |
| 400 | Invalid email, role, status, or other validation failure | User is not created |
| 401 | Missing or invalid session | User is not created |
| 403 | Authenticated user is not admin | User is not created |
| 409 or existing duplicate-error status | Email already exists | Existing user is unchanged |

## GET /admin/users

List users for admin management.

### Success Response: 200

```json
[
  {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "status": "active",
    "role": "staff",
    "isTest": true,
    "lastLoginAt": "2026-08-17T10:00:00.000Z",
    "createdAt": "2026-08-01T00:00:00.000Z",
    "updatedAt": "2026-08-17T10:00:00.000Z"
  }
]
```

## GET /admin/users/:id and GET /users/:id

Return user details including `isTest` and excluding password-related data.

## GET /users

Return listed user records including `isTest` and excluding password-related data.

## PATCH /admin/users/:id

Existing update behavior remains in scope only to preserve response consistency.

### Response Rule

- Updated user responses include `isTest`.
- Password remains optional for updates unless a future feature changes update semantics.
- This feature does not require changing the marker after registration.

## Password Login Behavior

Existing password login behavior must remain unchanged for test and non-test users. A test user with active status, valid role, and correct credentials is treated the same as a non-test user for this feature.
