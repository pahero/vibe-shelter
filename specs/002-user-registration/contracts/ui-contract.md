# UI Contract: User Registration

## Scope

If the frontend exposes admin user creation, the registration UI must collect a password and explicit test-user marker before submitting the admin creation request.

## Registration Form Fields

| Field | Required | Behavior |
|-------|----------|----------|
| Email | Yes | Identifies the new user |
| Full name | No | Optional display name |
| Role | Yes | Existing role choices |
| Status | Yes | Existing status choices |
| Password | Yes | Must be entered before submission |
| Test user | Yes | Explicit yes/no selection; no implicit blank state at submission |

## Submission Behavior

- Disable or reject submission when password is missing, empty, or blank.
- Disable or reject submission when the test-user marker has not been selected.
- Submit `isTest: true` for test users and `isTest: false` for non-test users.
- On success, show a clear success confirmation and include the marker wherever the created user is displayed.
- On validation failure, show a field-specific correction message and do not imply that the user was created.

## Display Behavior

- User lists and user details that show administrative user metadata should display whether the user is a test user.
- The marker must be informational only; it must not hide actions, change navigation, alter permissions, or block login.

## Accessibility and Usability

- The password input must have an accessible label.
- The test-user control must expose both choices clearly to assistive technology.
- Validation messages must be associated with the relevant fields where practical.
