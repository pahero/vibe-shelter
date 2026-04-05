# Authentication Plan (MVP - Google SSO)

## Goal
Use the simplest possible authentication for MVP: Google sign-in for active users, while still supporting inactive placeholder users that cannot log in.

## 1. User Types
- Active user:
  - Has email
  - Can log in with Google
  - Can manage shelter data
- Inactive user (placeholder):
  - Represents a person (for example foster caregiver)
  - Cannot log in
  - Appears in shelter records only

## 2. MVP Authentication Scope
Include:
- Sign in with Google
- Logout
- Basic session handling
- User management by email (active or inactive)

Exclude for now:
- Email and password authentication
- Password reset flow
- Two-factor authentication
- Complex permission matrix

## 3. Core Rules
- Only users marked as active can access the app.
- Google account email must match an existing active user email.
- Inactive users can never log in.
- Email must be unique.

## 4. Auth Flow
### 4.1 Sign In (Google)
1. User clicks Sign in with Google.
2. Google returns verified user email.
3. System checks if email exists and user status is active.
4. If yes, create session and redirect to Main Page.
5. If no, deny access with message: Access not granted. Contact admin.

### 4.2 Logout
1. User clicks logout.
2. Session is destroyed.
3. User is redirected to Sign In page.

### 4.3 User Creation
1. Admin creates user by email.
2. Admin selects status: active or inactive.
3. Active user can sign in via Google when needed.
4. Inactive user has no login access.

## 5. Minimal Data Model
User:
- id
- email
- full_name
- status (active or inactive)
- role (admin or staff)
- created_at
- updated_at
- last_login_at

Session:
- id
- user_id
- created_at
- expires_at
- revoked_at

## 6. Authorization (Simple)
- Unauthenticated users:
  - Access only Sign In page.
- Authenticated staff users:
  - Access all MVP shelter pages.
- Admin users:
  - Same as staff, plus user management.

## 7. Security Basics
- Enforce HTTPS in production.
- Use secure, HttpOnly, SameSite cookies for sessions.
- Validate Google ID token server-side.
- Restrict accepted Google account domain if required.
- Add basic audit logs for sign-in and sign-out.

## 8. UI Pages (MVP)
- Sign In page (one button: Sign in with Google)
- User Management page (admin)

## 9. Suggested Delivery Steps
1. Configure Google OAuth client.
2. Create user and session tables.
3. Implement Google callback endpoint and token verification.
4. Allow login only for active users in database.
5. Protect app routes with session middleware.
6. Add admin page for active and inactive users.

## 10. Acceptance Criteria
- Active user with Google account can sign in and access the app.
- Active user not in database cannot access the app.
- Inactive user cannot access the app.
- Logged-out user cannot access protected pages.
- Admin can create and manage active and inactive users.
