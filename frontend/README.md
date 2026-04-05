# Shelter Frontend (Next.js)

Next.js frontend for the Shelter app with Google SSO and plain email/password auth integration against the NestJS backend.

## Features

- Landing page with secure sign-in entry point
- Login screen wired to backend `POST /auth/login` and `GET /auth/google`
- Protected dashboard that reads current user from `GET /auth/me`
- Logout button wired to `POST /auth/logout`
- Server-side session-aware redirects

## Prerequisites

- Node.js LTS
- Running backend on `http://localhost:3000` (or your configured API URL)

## Environment

Create `.env.local` (or copy `.env.example`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:3001`.

## Important Backend Setting

In backend `.env`, set frontend URL to match the actual Next.js URL:

```bash
FRONTEND_URL=http://localhost:3001
```

This is used for CORS and OAuth redirect destination.

## Routes

- `/` - Landing page
- `/login` - Sign-in page
- `/dashboard` - Protected page (redirects to `/login` if session is missing)

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Lint checks
