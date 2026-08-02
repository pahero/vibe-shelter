# Backend - Shelter App

## Overview
This is the NestJS backend for the Shelter application. It provides authentication using Google OAuth and session management.

## Prerequisites
- Node.js LTS
- PostgreSQL 12+
- Google OAuth credentials

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 3. Database Setup
```bash
# Create database
createdb shelter

# Run migrations
npm run db:migrate

# Seed initial data (admin user)
npm run db:seed
```

### 4. Google OAuth Setup
1. Create a Google OAuth app at https://console.cloud.google.com
2. Add callback URL: `http://localhost:4000/auth/google/callback`
3. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /auth/login` - Plain email/password login
- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/me` - Get current user (requires session)
- `POST /auth/logout` - Logout current user
- `POST /auth/session/refresh` - Refresh session token

### Users
- `GET /users` - List all users (requires session)
- `GET /users/:id` - Get user by ID

### Admin
- `POST /admin/users` - Create user (admin only)
- `GET /admin/users` - List users with filters (admin only)
- `GET /admin/users/:id` - Get user details (admin only)
- `PATCH /admin/users/:id` - Update user (admin only)
- `PATCH /admin/users/:id/status` - Update user status (admin only)
- `DELETE /admin/users/:id` - Delete user (admin only)

### Health
- `GET /health` - Health check

## Testing
```bash
npm run test
npm run test:watch
npm run test:cov
```

## Database Migrations

### Create Migration
```bash
npm run db:migrate
```

### Revert Migration
```bash
npm run db:migrate:revert
```

## Project Structure
```
src/
├── app.module.ts
├── app.controller.ts
├── main.ts
├── config/
│   └── configuration.ts
├── database/
│   ├── database.module.ts
│   └── prisma.service.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/
│   │   └── google.strategy.ts
│   ├── guards/
│   │   ├── session-auth.guard.ts
│   │   └── admin-role.guard.ts
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   └── dto/
│       └── index.ts
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
└── admin/
    ├── admin.module.ts
    └── admin.controller.ts

prisma/
├── schema.prisma
└── seed.ts
```

## Security Notes
- Always use HTTPS in production
- Keep `SESSION_SECRET` secure
- Use strong session TTL values
- Implement rate limiting on auth endpoints
- Validate all input
- Use environment variables for sensitive data

## Troubleshooting

### Session Issues
- Ensure `SESSION_SECRET` is set
- Check database connection
- Verify CORS settings match frontend URL

### OAuth Issues
- Verify Google credentials are correct
- Check callback URL matches configuration
- Ensure frontend URL is correctly set

## License
Proprietary
