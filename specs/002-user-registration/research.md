# Research: User Registration

## Decision: Extend Existing Admin User Creation

Use the existing admin-protected `POST /admin/users` flow as the registration mechanism for this feature.

**Rationale**: The specification assumes registration is performed by an authorized operator. The backend already has admin-only user management protected by session and admin role guards, and public self-service signup would materially expand scope and security exposure.

**Alternatives considered**: Public `/register` signup was rejected because it conflicts with the spec assumption and current access model. A separate operator-only registration endpoint was rejected because it duplicates existing admin user management.

## Decision: Require Password on User Creation Only

Make `password` mandatory for creating a user and keep password updates optional for editing existing users.

**Rationale**: The feature states the password must be provided for registration. Existing update behavior allows admins to change role/status/full name without resetting a password, which is outside registration scope and should remain unchanged unless separately requested.

**Alternatives considered**: Requiring password on all user updates was rejected because it would make routine profile/status edits harder and is not required by the feature. Keeping password optional at creation was rejected because it violates the primary requirement.

## Decision: Store Test Marker as a Boolean User Field

Represent the marker as a required user-level boolean named `isTest`, with a default value for existing records during migration.

**Rationale**: The marker has exactly two valid values: test user or not test user. A boolean is directly testable, easy to expose in responses, and does not imply additional states or behavior. A migration default prevents existing users from becoming invalid while new registration requests must still specify a value.

**Alternatives considered**: A string enum was rejected as unnecessarily broad for two values. A nullable marker was rejected because the spec requires every registered user to be specified as test or not. A separate marker table was rejected as over-engineering.

## Decision: Return `isTest` in User Read Responses

Include the marker in admin and authenticated user list/detail responses, but never return password or password hash data.

**Rationale**: Operators need to verify the marker after registration and distinguish test users later. Existing user responses already expose non-secret account metadata such as status and role; the marker fits that contract.

**Alternatives considered**: Storing the marker without returning it was rejected because it would not satisfy the user story for identifying test users. Returning password-related data was rejected for security reasons.

## Decision: Combine Registration Form and User List in Admin UI

Show the current admin user list in the same registration experience as the user creation form, and refresh or update that list after a successful registration.

**Rationale**: The updated requirement asks for the user list with the registration form itself. Keeping both together lets authorized operators verify existing users before submission, see whether a duplicate may already exist, and confirm the newly registered user and marker without navigating away.

**Alternatives considered**: Keeping the form and list on separate pages was rejected because it requires navigation away from the registration form. Showing only the newly created user confirmation was rejected because it does not provide the requested full user list context. Embedding a read-only snapshot that does not refresh was rejected because it can leave the operator without confirmation that the created user is now in the list.

## Decision: Preserve Account Behavior for Test Users

Do not change login, role, status, permissions, session creation, or visibility based on `isTest`.

**Rationale**: The feature says the test setting is just a marker for now. Behavioral changes would introduce hidden scope and additional acceptance criteria.

**Alternatives considered**: Blocking test users from login, filtering them by default, or restricting their permissions were rejected because those are future features rather than marker behavior.

## Decision: Test Through Database Service and Admin Contract

Use backend database tests for storage/validation behavior and integration or controller-level contract tests for admin endpoint behavior.

**Rationale**: The constitution requires complete, isolated, behavior-focused tests. The project already has transaction-backed database tests and authenticated integration patterns for user-related behavior.

**Alternatives considered**: Testing only DTO validation was rejected because it would miss stored marker behavior and partial-user prevention. Manual validation only was rejected by the constitution.
