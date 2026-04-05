# Auth Backend Plan (NestJS + PostgreSQL)

## 1. Objective
Build a production-ready authentication backend for the shelter app using:
- NestJS (API)
- PostgreSQL (data)
- Google SSO (OAuth 2.0 / OpenID Connect)
- Cookie-based server sessions

This plan implements the rules from auth.md:
- Login only with Google
- Access only for pre-created active users
- Inactive users cannot log in
- Admin can manage users

## 2. Technology Stack
- Runtime: Node.js LTS
- Framework: NestJS
- Database: PostgreSQL
- ORM: Prisma (recommended) or TypeORM
- Session store: PostgreSQL-backed sessions (recommended) or Redis
- Validation: class-validator + class-transformer
- Auth strategy: Passport Google OAuth + server session

Recommended packages:
- @nestjs/common
- @nestjs/core
- @nestjs/config
- @nestjs/passport
- @nestjs/platform-express
- passport
- passport-google-oauth20
- express-session
- connect-pg-simple
- prisma (or typeorm)
- @prisma/client (or pg + typeorm)

## 3. High-Level Architecture
Modules:
- AppModule
- ConfigModule
- DatabaseModule
- AuthModule
- UsersModule
- SessionsModule
- AdminModule

AuthModule responsibilities:
- Google OAuth login start and callback
- Verify Google identity token/profile
- Resolve user by email
- Enforce active status
- Create and revoke sessions

UsersModule responsibilities:
- CRUD for users (admin only for create/update/deactivate)
- Role and status management

SessionsModule responsibilities:
- Session creation, lookup, expiration, revocation
- Session middleware integration

## 4. Data Model (PostgreSQL)

### 4.1 users
Columns:
- id UUID PK
- email CITEXT UNIQUE NOT NULL
- full_name TEXT NULL
- status TEXT NOT NULL CHECK (status IN ('active','inactive'))
- role TEXT NOT NULL CHECK (role IN ('admin','staff'))
- last_login_at TIMESTAMPTZ NULL
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

Indexes:
- UNIQUE(email)
- INDEX(status)
- INDEX(role)

### 4.2 sessions
Columns:
- id UUID PK
- user_id UUID NOT NULL REFERENCES users(id)
- session_token_hash TEXT NOT NULL UNIQUE
- user_agent TEXT NULL
- ip_address INET NULL
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()
- expires_at TIMESTAMPTZ NOT NULL
- revoked_at TIMESTAMPTZ NULL

Indexes:
- UNIQUE(session_token_hash)
- INDEX(user_id)
- INDEX(expires_at)
- INDEX(revoked_at)

## 5. Session Strategy (Cookie-Based)
- Browser gets opaque session cookie only
- Session truth is stored server-side in PostgreSQL
- Cookie settings:
  - HttpOnly: true
  - Secure: true in production
  - SameSite: Lax (or Strict if UX allows)
  - Domain: app domain
  - Path: /
  - Max-Age: for example 7 days
- On logout, mark session revoked and clear cookie

## 6. API Endpoints

Public:
- GET /auth/google
  - Starts Google OAuth flow
- GET /auth/google/callback
  - Handles Google response
  - Validates profile/email
  - Creates session for active user
  - Redirects to frontend
- POST /auth/logout
  - Revokes current session
  - Clears cookie
- GET /auth/me
  - Returns current authenticated user (or 401)

Admin only:
- POST /admin/users
  - Create user with email, full_name, role, status
- GET /admin/users
  - List users with filters (status, role)
- PATCH /admin/users/:id
  - Update role/status/full_name
- PATCH /admin/users/:id/status
  - Activate/deactivate user

Optional internal:
- POST /auth/session/refresh
  - Rotate session expiration

## 7. Authentication and Authorization Flow

Login flow:
1. User clicks Sign in with Google on frontend.
2. Frontend calls GET /auth/google.
3. User authenticates at Google.
4. Google redirects to callback.
5. Backend extracts verified email.
6. Backend finds user by email.
7. If user missing or inactive: deny access.
8. If active: create session, set cookie, update last_login_at.
9. Redirect to app main page.

Request protection flow:
1. Guard reads session cookie.
2. Resolve session in DB.
3. Validate: not expired, not revoked.
4. Load user and validate active status.
5. Attach user to request context.

Role authorization:
- Staff: MVP shelter routes
- Admin: staff routes + admin user management endpoints

## 8. NestJS Implementation Structure
Suggested directory layout:
- src/main.ts
- src/app.module.ts
- src/config/
- src/database/
- src/auth/
  - auth.module.ts
  - auth.controller.ts
  - auth.service.ts
  - google.strategy.ts
  - guards/session-auth.guard.ts
  - decorators/current-user.decorator.ts
- src/users/
  - users.module.ts
  - users.service.ts
  - users.controller.ts
  - dto/
- src/admin/
  - admin.module.ts
  - admin.users.controller.ts
  - guards/admin-role.guard.ts
- src/sessions/
  - sessions.module.ts
  - sessions.service.ts

## 9. Environment Variables
- NODE_ENV
- PORT
- DATABASE_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_CALLBACK_URL
- SESSION_COOKIE_NAME
- SESSION_SECRET
- SESSION_TTL_HOURS
- FRONTEND_URL
- ALLOWED_GOOGLE_DOMAIN (optional)

## 10. Security Controls
- Enforce HTTPS and HSTS at ingress
- CSRF protection for state-changing endpoints
- Strict CORS for frontend origin
- Input validation on all DTOs
- Rate limit auth endpoints
- Rotate session ID after login
- Session cleanup job for expired sessions
- Store hashed session token, not raw token
- Do not expose internal auth errors to clients

## 11. Database Migration Plan
1. Create users table with constraints and indexes.
2. Create sessions table with expiry/revocation fields.
3. Seed initial admin user (active).
4. Add recurring cleanup task for expired/revoked sessions.

## 12. Implementation Milestones

Milestone 1: Foundation
- Initialize NestJS app, config, database connection
- Add migration tooling
- Create users and sessions models

Milestone 2: Google Auth + Sessions
- Implement Google strategy and callback
- Implement session creation and cookie middleware
- Implement /auth/me and /auth/logout

Milestone 3: Guards and Roles
- Add session auth guard
- Add role guard (admin vs staff)
- Protect routes

Milestone 4: Admin User Management
- Create admin users endpoints
- Add activate/deactivate logic

Milestone 5: Hardening
- Rate limiting
- CSRF/CORS finalization
- Monitoring and structured logging

## 13. Acceptance Criteria (Backend)
- Active user existing in DB can sign in with Google.
- Active user not in DB cannot sign in.
- Inactive user cannot sign in.
- /auth/me returns user when session valid, 401 otherwise.
- Logout revokes session and clears cookie.
- Admin can create active/inactive users and change status.
- Non-admin cannot access admin user endpoints.

## 14. Suggested Next File
Create auth-api.md for exact request and response contracts:
- Endpoint-by-endpoint payloads
- Error format
- Status codes
- Validation rules
