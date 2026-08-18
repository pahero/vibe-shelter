# Data Model: User Registration

## Entity: User

Represents a registered account that can be authenticated and managed by authorized operators.

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Identifier | Yes | Unique system-generated user identifier |
| `email` | Email | Yes | Unique user identity; normalized consistently with existing behavior |
| `fullName` | Text | No | Display name for the user |
| `passwordHash` | Secret credential hash | Yes for newly registered users | Derived from the supplied password; never returned in responses |
| `status` | User status | Yes | Existing active/inactive account status |
| `role` | User role | Yes | Existing admin/staff role |
| `isTest` | Boolean | Yes | `true` for test users, `false` for non-test users |
| `lastLoginAt` | Timestamp | No | Existing login tracking |
| `createdAt` | Timestamp | Yes | Existing creation timestamp |
| `updatedAt` | Timestamp | Yes | Existing update timestamp |

### Validation Rules

- `email` must be valid and unique according to existing user identity rules.
- `password` must be present, non-empty, and pass existing password length validation when registering a new user.
- `isTest` must be explicitly provided as `true` or `false` when registering a new user.
- `role` must remain one of the existing supported roles.
- `status` must remain one of the existing supported statuses.
- Failed validation must not create a user record or persist a password hash.
- User responses must include `isTest` and must not include `password`, `passwordHash`, or any password-derived secret.

### Relationships

- User retains existing relationships to sessions, owned locations, created cats, cat photos, and cat audit events.
- `isTest` does not create relationships and does not alter any existing relationship behavior.

### State Transitions

```text
registration submitted
├── valid email + password + explicit isTest + no duplicate identity
│   └── active or inactive user record created with stored marker
└── invalid or duplicate input
    └── registration rejected; no user record created
```

## Value Object: Test-User Marker

Represents whether a user is marked for testing.

### Values

| Value | Meaning | Behavior Impact |
|-------|---------|-----------------|
| `true` | User is a test user | Informational only |
| `false` | User is not a test user | Informational only |

### Validation Rules

- Must be explicitly selected during registration.
- Must remain boolean in request and response contracts.
- Must not affect authentication, authorization, account status, or session behavior in this feature.

## Read Model: Admin User List

Represents the collection of users displayed with the registration form in the admin registration experience.

### Fields

The list uses the non-secret user response fields from the `User` entity: `id`, `email`, `fullName`, `status`, `role`, `isTest`, `lastLoginAt`, `createdAt`, and `updatedAt`.

### Validation Rules

- Must be visible in the same registration experience as the user creation form.
- Must include `isTest` for each listed user.
- Must exclude `password`, `passwordHash`, and password-derived secret data.
- Must update or refresh after successful registration so the newly created user appears without requiring a separate navigation step.
