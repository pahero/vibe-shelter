# Implementation Architecture Guide

## Overview
This NestJS backend implements secure authentication using Google OAuth and server-side sessions with PostgreSQL persistence.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP Requests
                         │ (with cookies)
┌────────────────────────▼────────────────────────────────┐
│                  Nginx/Reverse Proxy                      │
│              (HTTPS, CORS, Session Proxy)                 │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    NestJS Backend                         │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Auth Module                                     │    │
│  │  - Google OAuth Strategy (Passport)              │    │
│  │  - Auth Service (session management)             │    │
│  │  - Auth Controller (endpoints)                   │    │
│  │  - Guards (SessionAuthGuard, AdminRoleGuard)     │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Users Module                                    │    │
│  │  - Users Service (CRUD operations)               │    │
│  │  - Users Controller (read endpoints)             │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Admin Module                                    │    │
│  │  - Admin Controller (user management)            │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Database Module                                 │    │
│  │  - Prisma Service (ORM)                          │    │
│  └──────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │PostgreSQL│    │  Google │    │ Session  │
    │ Database │    │  OAuth  │    │  Store   │
    │          │    │         │    │  (DB)    │
    └──────────┘    └─────────┘    └──────────┘
```

## Authentication Flow

### 1. Login Flow
```
1. User clicks "Sign in with Google"
   ↓
2. Frontend redirects to GET /auth/google
   ↓
3. Passport Google Strategy redirects to Google consent screen
   ↓
4. User authorizes app at Google
   ↓
5. Google redirects to GET /auth/google/callback with auth code
   ↓
6. Backend validates authorization code
   ↓
7. Backend extracts user email from Google profile
   ↓
8. Backend queries User table for email
   ↓
9. IF user not found OR inactive:
     └→ Redirect to /login?error=unauthorized
   ELSE:
     ↓
10. Backend creates new Session record
    ↓
11. Backend sets session cookie (HttpOnly, Secure, SameSite=Lax)
    ↓
12. Backend updates user.lastLoginAt
    ↓
13. Redirect to frontend /dashboard
    ↓
14. Frontend reads cookie and can now make authenticated requests
```

### 2. Authenticated Request Flow
```
1. Frontend makes request with session cookie
   ↓
2. Express middleware reads session cookie
   ↓
3. SessionAuthGuard loads user from database
   ↓
4. Guard validates:
   - Session exists
   - Not revoked
   - Not expired
   - User is active
   ↓
5. If validation passes:
   - Attach user to request context
   - Allow request to proceed
   ↓
6. If validation fails:
   - Return 401 Unauthorized
   - Frontend should redirect to login
```

### 3. Authorization Flow (Admin Routes)
```
1. SessionAuthGuard validates session (see above)
   ↓
2. AdminRoleGuard checks user.role === 'ADMIN'
   ↓
3. If not admin:
   - Return 403 Forbidden
   ELSE:
   - Allow request to proceed
```

## Data Model

### User Entity
```
{
  id: UUID              // Primary key, auto-generated
  email: String         // Unique, case-insensitive (CITEXT)
  fullName: String      // Optional
  status: Enum          // 'ACTIVE' or 'INACTIVE'
  role: Enum            // 'ADMIN' or 'STAFF'
  lastLoginAt: DateTime // Updated on each login
  createdAt: DateTime   // Auto-set
  updatedAt: DateTime   // Auto-updated
  sessions: Session[]   // Related sessions
}
```

### Session Entity
```
{
  id: UUID              // Primary key, auto-generated
  userId: UUID          // Foreign key to User
  sessionTokenHash: String  // Hash of session token (stored hashed)
  userAgent: String     // Browser user agent (optional)
  ipAddress: String     // Client IP address (optional)
  createdAt: DateTime   // Auto-set
  expiresAt: DateTime   // Auto-calculated TTL
  revokedAt: DateTime   // Set on logout (optional)
  user: User            // Related user
}
```

## Module Overview

### AuthModule
Handles authentication, OAuth, and session management.

**Key Exports:**
- `AuthService` - Core authentication logic
- `SessionAuthGuard` - Session validation guard
- `AdminRoleGuard` - Admin role checking guard

**Key Methods:**
- `validateGoogleProfile(profile)` - Validate Google OAuth profile
- `createSession(userId, userAgent, ipAddress)` - Create new session
- `validateSession(sessionId)` - Validate existing session
- `revokeSession(sessionId)` - Logout (revoke session)
- `cleanupExpiredSessions()` - Delete expired sessions

### UsersModule
Handles user data operations (read-heavy module).

**Key Exports:**
- `UsersService` - User CRUD operations

**Key Methods:**
- `findByEmail(email)` - Find user by email
- `findById(id)` - Find user by ID
- `getAll(filters)` - List users with optional filters
- `updateLastLogin(id)` - Update last login timestamp

### AdminModule
Admin-only user management endpoints.

**Controllers:**
- `AdminUsersController` - User CRUD for admins

**Endpoints:**
- `POST /admin/users` - Create user
- `GET /admin/users` - List users
- `GET /admin/users/:id` - Get user details
- `PATCH /admin/users/:id` - Update user
- `PATCH /admin/users/:id/status` - Change user status
- `DELETE /admin/users/:id` - Delete user

### DatabaseModule
Provides Prisma ORM service.

**Exports:**
- `PrismaService` - Database client wrapper

## Error Handling

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (no valid session)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Standard Error Response
```json
{
  "statusCode": 401,
  "message": "Session expired",
  "error": "Unauthorized"
}
```

## Security Features

### 1. Session Security
- Sessions stored server-side in PostgreSQL
- Only session ID sent to client (in cookie)
- Session token hashed before storage
- Sessions expire after configured TTL
- Sessions can be revoked immediately

### 2. Cookie Security
- HttpOnly: prevents XSS attacks
- Secure: only sent over HTTPS (production)
- SameSite=Lax: prevents CSRF attacks
- Domain scoped to API domain

### 3. Authentication Security
- Google OAuth used (no password storage)
- Email verification delegated to Google
- Domain whitelist support (optional)
- User status validation (active/inactive)

### 4. Authorization Security
- Role-based access control (RBAC)
- Admin role required for user management
- Guards validate all protected endpoints
- Decorators for accessing current user

### 5. Input Validation
- class-validator on all DTOs
- Email format validation
- Enum validation for status/role
- Whitelist/forbid unknown properties

## Extension Points

### Adding New Modules

1. **Create Module Structure**
```typescript
// src/feature/feature.module.ts
@Module({
  imports: [DatabaseModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
```

2. **Import in AppModule**
```typescript
@Module({
  imports: [FeatureModule],
})
export class AppModule {}
```

### Adding Protected Endpoints

```typescript
@Get('protected')
@UseGuards(SessionAuthGuard)
async protectedRoute(@CurrentUser() user) {
  // User is injected automatically
}
```

### Adding Admin-Only Endpoints

```typescript
@Post('admin-action')
@UseGuards(SessionAuthGuard, AdminRoleGuard)
async adminAction() {
  // Only admins can access
}
```

## Testing Strategy

### Unit Tests
```bash
npm run test
```

Test individual services in isolation:
- `AuthService` - OAuth logic, session management
- `UsersService` - User queries, updates

### Integration Tests
Test module interactions:
- Google OAuth flow
- Full login flow
- Session validation

### E2E Tests
Full request/response cycles:
- Login workflow
- User management
- Permission checks

## Performance Considerations

### Database Queries
- Indexes on frequently queried columns (email, status, role, userId)
- Lazy loading via Prisma relations
- N+1 query prevention with include/select

### Session Management
- PostgreSQL as session store (built-in with express-session)
- TTL-based cleanup of expired sessions
- Hash-based session token storage

### Future Optimizations
- Redis for session store (if scaling needed)
- Query caching with Redis
- Database connection pooling tuning

## Common Patterns

### Accessing Current User
```typescript
@UseGuards(SessionAuthGuard)
async someRoute(@CurrentUser() user) {
  console.log(user.id, user.email, user.role);
}
```

### Admin Route Protection
```typescript
@UseGuards(SessionAuthGuard, AdminRoleGuard)
async adminRoute() {
  // Automatic 403 if not admin
}
```

### Filtering Users
```typescript
const users = await this.usersService.getAll({
  status: 'active',
  role: 'staff'
});
```

## Debugging

### Enable Logs
```typescript
// main.ts
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'debug'],
});
```

### Database Queries
```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL") // For migrations
}
```

### Session Inspection
```typescript
// In Guard or Interceptor
console.log(request.session);    // Session object
console.log(request.sessionID);  // Session ID
console.log(request.user);       // Attached user
```
