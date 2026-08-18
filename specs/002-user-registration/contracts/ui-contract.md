# UI Contract: User Registration

## Scope

The frontend admin registration UI must collect a password and explicit test-user marker before submitting the admin creation request, and it must show the current user list with the registration form itself.

## Layout and Navigation

- The registration form and user list must be visible in the same admin registration experience without requiring navigation away from the form.
- The user list may be beside, above, or below the form depending on viewport size, but both must remain part of the same screen or route.
- On smaller screens, stacking the form and list is acceptable if the operator can move between them by scrolling rather than changing pages.

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
- On success, show a clear success confirmation and update or refresh the colocated user list so the created user is displayed with the selected marker.
- On validation failure, show a field-specific correction message and do not imply that the user was created.

## Display Behavior

- User lists and user details that show administrative user metadata should display whether the user is a test user.
- The user list shown with the registration form must include existing users and the newly registered user after successful submission.
- The marker must be informational only; it must not hide actions, change navigation, alter permissions, or block login.

## Accessibility and Usability

- The password input must have an accessible label.
- The test-user control must expose both choices clearly to assistive technology.
- Validation messages must be associated with the relevant fields where practical.
