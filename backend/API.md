# Shelter Backend API Documentation

## Overview
REST API for the Shelter application authentication backend. Uses cookie-based sessions with Google OAuth for login.

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints except login-related endpoints require a valid session cookie. Include `credentials: 'include'` in fetch requests.

## Error Responses
All error responses follow this format:
```json
{
  "statusCode": 401,
  "message": "Error message",
  "error": "Unauthorized"
}
```

---

## Endpoints

### Health Check

#### GET /health
Check server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### Authentication

#### GET /auth/google
Start Google OAuth flow.

**Response:** Redirects to Google login page.

---

#### GET /auth/google/callback
Google OAuth callback handler.

**Query Parameters:**
- `code` (required) - Authorization code from Google
- `state` (required) - CSRF state parameter

**Response:** Redirects to frontend dashboard on success or error page on failure.

---

#### GET /auth/me
Get current authenticated user.

**Headers:**
```
Cookie: shelter_session=<session_cookie>
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "fullName": "John Doe",
  "role": "staff"
}
```

**Status Codes:**
- `200` - Success
- `401` - Not authenticated

---

#### POST /auth/logout
Logout current user and revoke session.

**Headers:**
```
Cookie: shelter_session=<session_cookie>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

**Status Codes:**
- `200` - Success
- `401` - Not authenticated
- `500` - Server error

---

#### POST /auth/session/refresh
Refresh the current session token.

**Headers:**
```
Cookie: shelter_session=<session_cookie>
```

**Response:**
```json
{
  "message": "Session refreshed"
}
```

**Status Codes:**
- `200` - Success
- `400` - Failed to refresh session
- `401` - Not authenticated

---

### Users

#### GET /users
List all users (requires session).

**Headers:**
```
Cookie: shelter_session=<session_cookie>
```

**Query Parameters:**
- `status` (optional) - Filter by status: "active" or "inactive"
- `role` (optional) - Filter by role: "admin" or "staff"

**Response:**
```json
[
  {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "status": "active",
    "role": "staff",
    "lastLoginAt": "2024-01-15T10:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Not authenticated

---

#### GET /users/:id
Get user by ID (requires session).

**Headers:**
```
Cookie: shelter_session=<session_cookie>
```

**Path Parameters:**
- `id` (required) - User ID

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "fullName": "John Doe",
  "status": "active",
  "role": "staff",
  "lastLoginAt": "2024-01-15T10:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Not authenticated
- `404` - User not found

---

### Admin Users Management

All admin endpoints require admin role (`role: 'admin'`).

#### POST /admin/users
Create a new user.

**Headers:**
```
Cookie: shelter_session=<session_cookie>
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "fullName": "Jane Smith",
  "role": "staff",
  "status": "active"
}
```

**Response:**
```json
{
  "id": "new_user_id",
  "email": "newuser@example.com",
  "fullName": "Jane Smith",
  "status": "active",
  "role": "staff",
  "lastLoginAt": null,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `201` - Created
- `400` - Invalid input
- `401` - Not authenticated
- `403` - Not admin

---

#### GET /admin/users
List all users with optional filters (admin only).

**Headers:**
```
Cookie: shelter_session=<session_cookie>
```

**Query Parameters:**
- `status` (optional) - "active" or "inactive"
- `role` (optional) - "admin" or "staff"

**Response:**
```json
[
  {
    "id": "user_id",
    "email": "user@example.com",
    "fullName": "John Doe",
    "status": "active",
    "role": "staff",
    "lastLoginAt": "2024-01-15T10:00:00Z",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Not authenticated
- `403` - Not admin

---

#### GET /admin/users/:id
Get user details (admin only).

**Headers:**
```
Cookie: shelter_session=<session_cookie>
```

**Path Parameters:**
- `id` (required) - User ID

**Response:** User object (same format as POST /admin/users)

**Status Codes:**
- `200` - Success
- `401` - Not authenticated
- `403` - Not admin
- `404` - User not found

---

#### PATCH /admin/users/:id
Update user details (admin only).

**Headers:**
```
Cookie: shelter_session=<session_cookie>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required) - User ID

**Request Body:**
```json
{
  "fullName": "John Smith",
  "role": "admin",
  "status": "inactive"
}
```

**Response:** Updated user object

**Status Codes:**
- `200` - Success
- `400` - Invalid input
- `401` - Not authenticated
- `403` - Not admin
- `404` - User not found

---

#### PATCH /admin/users/:id/status
Update user status (admin only).

**Headers:**
```
Cookie: shelter_session=<session_cookie>
Content-Type: application/json
```

**Path Parameters:**
- `id` (required) - User ID

**Request Body:**
```json
{
  "status": "active"
}
```

**Response:** Updated user object

**Status Codes:**
- `200` - Success
- `400` - Invalid status
- `401` - Not authenticated
- `403` - Not admin
- `404` - User not found

---

#### DELETE /admin/users/:id
Delete user (admin only).

**Headers:**
```
Cookie: shelter_session=<session_cookie>
```

**Path Parameters:**
- `id` (required) - User ID

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

**Status Codes:**
- `200` - Success
- `401` - Not authenticated
- `403` - Not admin
- `404` - User not found

---

## Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Session Cookie
- Name: `shelter_session` (configurable)
- HttpOnly: true
- Secure: true (production only)
- SameSite: Lax
- Max-Age: 7 days (configurable)

## CORS Headers
Requests must come from configured frontend URL.

## Rate Limiting
Consider implementing rate limiting on:
- POST /auth/google
- GET /auth/google/callback
- POST /auth/logout
- Admin endpoints
