# Authentication

## Overview

Authentication is fully delegated to **Supabase Auth**. The backend never stores
passwords, never issues tokens, and never manages sessions.

The backend's only responsibility is to **validate the Supabase access token** on every
protected request and identify the authenticated user.

---

## Frontend → Backend token flow

```
1. User signs in via Supabase Auth on the frontend
2. Supabase issues an access token (JWT)
3. Frontend sends the token with every API request:
      Authorization: ******
4. Backend validates the token with Supabase
5. Backend extracts the user identity and attaches it to the request context
6. Route handler reads c.get('authUser')
```

---

## Supabase Auth vs local UserProfile

|                   | Supabase Auth user             | Local UserProfile                          |
| ----------------- | ------------------------------ | ------------------------------------------ |
| **Stored where**  | Supabase Auth database         | Local PostgreSQL                           |
| **Manages**       | Identity, login, sessions, MFA | App-specific data (currency, locale, name) |
| **Identified by** | `user.id` (UUID)               | `profile.authUserId` (same UUID)           |
| **Created by**    | Supabase on sign-up            | Backend on first `/auth/me` call           |

The `UserProfile.authUserId` field is the bridge between the two systems. All business
tables (accounts, sections, categories, transactions, budgets) reference `UserProfile.id`.

---

## Backend Supabase client

`src/lib/supabase.ts` creates a single Supabase client using `SUPABASE_SERVICE_ROLE_KEY`.

This key:

- Allows the backend to call `supabase.auth.getUser(token)` to validate JWTs server-side.
- Bypasses Row Level Security — use it **only on the backend**, never expose it to the browser.

---

## Auth middleware

`src/modules/auth/auth.middleware.ts`

```typescript
// Applied to any route that requires authentication:
authRoutes.get('/me', authMiddleware, handler)
```

The middleware:

1. Reads the `Authorization` header.
2. Verifies it starts with `Bearer `
3. Calls `supabase.auth.getUser(token)`.
4. Returns `401 UNAUTHORIZED` if the token is missing, malformed, invalid, or expired.
5. Sets `c.set('authUser', { id, email })` for the route handler.

---

## How /api/v1/auth/me works

1. `authMiddleware` validates the token and sets `authUser` in the context.
2. `getOrCreateUserProfile(authUser)` upserts the local `UserProfile` record.
3. Returns both the Supabase user identity and the local profile.

This endpoint is a safe way for the frontend to bootstrap the session after sign-in.

---

## How to protect a future route

```typescript
import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'

const transactionRoutes = new Hono<AppBindings>()

transactionRoutes.get('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser') // typed: { id: string, email?: string }
    // fetch data scoped to authUser.id …
})
```

---

## Supabase Auth features (frontend only)

The frontend uses the Supabase JS client to handle:

- Sign up
- Sign in (email/password, OAuth, magic link, …)
- Forgot password / reset password
- Session refresh

The backend does not implement any of these — Supabase handles them entirely.
