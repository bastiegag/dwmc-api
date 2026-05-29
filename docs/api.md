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
| `VALIDATION_ERROR` | 400/422 | Request body or params failed validation |
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

**Auth:** required — JWT token in Authorization header

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

---

### GET /api/v1/sections

Returns sections for the authenticated user.

**Auth:** required — JWT token in Authorization header

**Query params**
- `includeArchived=true|false` (default: `false`)
- `includeCategories=true|false` (default: `false`)

**Response 200**
```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Food",
      "color": "#22c55e",
      "isArchived": false,
      "createdAt": "2026-05-29T10:00:00.000Z",
      "updatedAt": "2026-05-29T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/v1/sections

Creates a section for the authenticated user.

**Auth:** required — JWT token in Authorization header

**Request body**
```json
{
  "name": "Food",
  "color": "#22c55e"
}
```

**Response 201**
```json
{
  "data": {
    "id": "cuid",
    "name": "Food",
    "color": "#22c55e",
    "isArchived": false
  }
}
```

**Errors**
- `VALIDATION_ERROR` (400)
- `CONFLICT` (409)

---

### GET /api/v1/sections/:id

Returns one section owned by the authenticated user.

**Auth:** required — JWT token in Authorization header

**Query params**
- `includeCategories=true|false` (default: `false`)

**Errors**
- `NOT_FOUND` (404)

---

### PATCH /api/v1/sections/:id

Updates one section owned by the authenticated user.

**Auth:** required — JWT token in Authorization header

**Request body**
```json
{
  "name": "Home",
  "color": "#3b82f6",
  "isArchived": false
}
```

**Errors**
- `VALIDATION_ERROR` (400)
- `CONFLICT` (409)
- `NOT_FOUND` (404)

---

### DELETE /api/v1/sections/:id

Soft-deletes a section (`isArchived = true`) and archives all categories in that section.

**Auth:** required — JWT token in Authorization header

**Errors**
- `NOT_FOUND` (404)

---

### GET /api/v1/categories

Returns categories for the authenticated user.

**Auth:** required — JWT token in Authorization header

**Query params**
- `includeArchived=true|false` (default: `false`)
- `sectionId=<sectionId>` (optional)

If `sectionId` is provided and does not belong to the authenticated user, returns `VALIDATION_ERROR` (400).

**Response 200**
```json
{
  "data": [
    {
      "id": "cuid",
      "name": "Groceries",
      "icon": "shopping-cart",
      "sectionId": "section-cuid",
      "isArchived": false,
      "createdAt": "2026-05-29T10:00:00.000Z",
      "updatedAt": "2026-05-29T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/v1/categories

Creates a category for the authenticated user.

**Auth:** required — JWT token in Authorization header

**Request body**
```json
{
  "name": "Groceries",
  "icon": "shopping-cart",
  "sectionId": "section-cuid"
}
```

**Response 201**
```json
{
  "data": {
    "id": "cuid",
    "name": "Groceries",
    "icon": "shopping-cart",
    "sectionId": "section-cuid",
    "isArchived": false
  }
}
```

**Errors**
- `VALIDATION_ERROR` (400)
- `CONFLICT` (409)

---

### GET /api/v1/categories/:id

Returns one category owned by the authenticated user.

**Auth:** required — JWT token in Authorization header

**Errors**
- `NOT_FOUND` (404)

---

### PATCH /api/v1/categories/:id

Updates one category owned by the authenticated user.

**Auth:** required — JWT token in Authorization header

**Request body**
```json
{
  "name": "Restaurants",
  "icon": "utensils",
  "sectionId": "section-cuid",
  "isArchived": false
}
```

**Errors**
- `VALIDATION_ERROR` (400)
- `CONFLICT` (409)
- `NOT_FOUND` (404)

---

### DELETE /api/v1/categories/:id

Soft-deletes a category (`isArchived = true`).

**Auth:** required — JWT token in Authorization header

**Errors**
- `NOT_FOUND` (404)
