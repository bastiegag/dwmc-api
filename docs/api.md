# API Reference

## Base URL

```
http://localhost:3000
```

## Response format

All responses use a consistent JSON envelope.

### Success

```json
{
  "data": { ... }
}
```

### Error

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "issues": { ... }   // optional — present for VALIDATION_ERROR
  }
}
```

### Error codes

| Code | HTTP status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired token |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body or params failed Zod validation |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Endpoints

### GET /health

Liveness check — returns 200 as long as the process is alive.

**Auth:** none

**Response 200**
```json
{
  "data": {
    "status": "ok"
  }
}
```

---

### GET /ready

Readiness check — pings the database to confirm connectivity.

**Auth:** none

**Response 200**
```json
{
  "data": {
    "status": "ready",
    "database": "connected"
  }
}
```

**Response 503**
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Database unavailable"
  }
}
```

---

### GET /api/v1/auth/me

Returns the authenticated Supabase user and their local `UserProfile`.
Creates or updates the profile on every call to stay in sync with Supabase Auth.

**Auth:** required — `Authorization: ******`

**Response 200**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "profile": {
      "id": "cuid",
      "authUserId": "uuid",
      "email": "user@example.com",
      "firstName": null,
      "lastName": null,
      "currency": "CAD",
      "locale": "fr-CA"
    }
  }
}
```

**Response 401**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid Authorization header"
  }
}
```
