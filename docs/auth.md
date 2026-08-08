# Authentication

## Responsibility Split

Supabase Auth owns passwords, sign-in, sign-up, recovery, reset, sessions, and token issuance. The backend validates the access token on protected requests and never becomes the browser's session store.

The frontend sends:

```http
Authorization: Bearer <Supabase access token>
```

The frontend integration is documented in `dwmc-web/docs/frontend-api.md` in the sibling repository.

## Middleware

`src/modules/auth/auth.middleware.ts`:

1. Reads the `Authorization` header.
2. Requires the `Bearer ` prefix.
3. Passes the token to `supabase.auth.getUser(token)`.
4. Returns `401 UNAUTHORIZED` when the header or token is missing, malformed, invalid, or expired.
5. Stores `{ id, email }` as `authUser` in the Hono context.

All protected resource routes apply this middleware.

## Profile Synchronization

`GET /api/v1/auth/me` validates the token, upserts the local `UserProfile`, and returns both the authenticated Supabase identity and profile. The profile's `authUserId` is unique and is the bridge to all user-owned domain records.

A successful response has the form:

```json
{
    "data": {
        "user": { "id": "...", "email": "..." },
        "profile": { "id": "...", "authUserId": "..." }
    }
}
```

## Authorization

Authentication proves identity; it does not grant access to another user's records. Services resolve `UserProfile` and repositories filter by its ID. A resource belonging to another user is treated as not found by the resource lookup patterns. Frontend route visibility is not authorization.

## Secrets

The backend service-role key is required only by the backend Supabase client. It must never be exposed through frontend variables, API responses, logs, or committed files.

Logout is handled by the frontend Supabase client. The backend does not manage browser sessions.
