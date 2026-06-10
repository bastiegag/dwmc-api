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

| Code                    | HTTP status | Description                              |
| ----------------------- | ----------- | ---------------------------------------- |
| `UNAUTHORIZED`          | 401         | Missing, invalid, or expired token       |
| `FORBIDDEN`             | 403         | Authenticated but not permitted          |
| `NOT_FOUND`             | 404         | Resource does not exist                  |
| `VALIDATION_ERROR`      | 400/422     | Request body or params failed validation |
| `CONFLICT`              | 409         | Resource already exists                  |
| `INTERNAL_SERVER_ERROR` | 500         | Unexpected server error                  |

---

## Pagination

List endpoints use cursor-based pagination. Responses for paginated endpoints return the standard envelope with an additional `nextCursor` field set to a string id when more pages exist or `null` when the page is the last one.

Query params used by paginated endpoints:

- `cursor=<id>` (optional) — id of the last item from the previous page
- `limit=<number>` (optional, default: `50`, min: `1`, max: `100`)

Example paginated response:

```json
{
    "data": [
        /* items */
    ],
    "nextCursor": null
}
```

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
- `cursor=<id>` (optional) — pagination cursor (see Pagination)
- `limit=<number>` (optional, default: `50`) — page size (1–100)

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
    ],
    "nextCursor": null
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

**Response 200**

```json
{
    "data": {
        "id": "cuid",
        "name": "Food",
        "color": "#22c55e",
        "isArchived": false,
        "categories": [
            /* optional when includeCategories=true */
        ],
        "createdAt": "2026-05-29T10:00:00.000Z",
        "updatedAt": "2026-05-29T10:00:00.000Z"
    }
}
```

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

- `cursor=<id>` (optional) — pagination cursor (see Pagination)
- `limit=<number>` (optional, default: `50`) — page size (1–100)

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
    ],
    "nextCursor": null
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

**Response 200**

```json
{
    "data": {
        "id": "cuid",
        "name": "Groceries",
        "icon": "shopping-cart",
        "sectionId": "section-cuid",
        "isArchived": false,
        "createdAt": "2026-05-29T10:00:00.000Z",
        "updatedAt": "2026-05-29T10:00:00.000Z"
    }
}
```

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

---

### GET /api/v1/accounts

Returns accounts for the authenticated user. Archived accounts are excluded by default.

**Auth:** required — JWT token in Authorization header

**Query params**

- `includeArchived=true|false` (default: `false`)
- `type=CHECKING|SAVINGS|CREDIT_CARD|CASH|INVESTMENT|LOAN|OTHER` (optional)

**Response 200**

```json
{
    "data": [
        {
            "id": "cuid",
            "name": "Checking Account",
            "type": "CHECKING",
            "startingBalance": 1250.75,
            "currentBalance": 1250.75,
            "goal": null,
            "color": "#3b82f6",
            "icon": "wallet",
            "isArchived": false,
            "createdAt": "2026-06-07T10:00:00.000Z",
            "updatedAt": "2026-06-07T10:00:00.000Z"
        }
    ]
}
```

---

### POST /api/v1/accounts

Creates an account for the authenticated user.

**Auth:** required — JWT token in Authorization header

**Request body**

```json
{
    "name": "Checking Account",
    "type": "CHECKING",
    "startingBalance": 1250.75,
    "goal": null,
    "color": "#3b82f6",
    "icon": "wallet"
}
```

| Field             | Type                                                            | Required | Notes                                |
| ----------------- | --------------------------------------------------------------- | -------- | ------------------------------------ |
| `name`            | string                                                          | yes      | Trimmed, 1–80 chars, unique per user |
| `type`            | `CHECKING\|SAVINGS\|CREDIT_CARD\|CASH\|INVESTMENT\|LOAN\|OTHER` | no       | Default: `CHECKING`                  |
| `startingBalance` | number                                                          | no       | Default: `0`. Can be negative        |
| `goal`            | number \| null                                                  | no       | Optional savings goal                |
| `color`           | string                                                          | yes      | Trimmed, 1–40 chars                  |
| `icon`            | string                                                          | yes      | Trimmed, 1–80 chars                  |

**Response 201**

```json
{
    "data": {
        "id": "cuid",
        "name": "Checking Account",
        "type": "CHECKING",
        "startingBalance": 1250.75,
        "currentBalance": 1250.75,
        "goal": null,
        "color": "#3b82f6",
        "icon": "wallet",
        "isArchived": false,
        "createdAt": "2026-06-07T10:00:00.000Z",
        "updatedAt": "2026-06-07T10:00:00.000Z"
    }
}
```

**Errors**

- `VALIDATION_ERROR` (422)
- `CONFLICT` (409) — account name already exists for this user

---

### GET /api/v1/accounts/:id

Returns one account owned by the authenticated user.

**Auth:** required — JWT token in Authorization header

**Errors**

- `NOT_FOUND` (404)

---

### PATCH /api/v1/accounts/:id

Updates one account owned by the authenticated user. All fields are optional.

**Auth:** required — JWT token in Authorization header

**Request body**

```json
{
    "name": "Main Checking",
    "startingBalance": 2000.0,
    "isArchived": false
}
```

**Errors**

- `VALIDATION_ERROR` (422)
- `CONFLICT` (409) — new name already used by another account
- `NOT_FOUND` (404)

---

### DELETE /api/v1/accounts/:id

Soft-deletes an account (`isArchived = true`).

**Auth:** required — JWT token in Authorization header

**Errors**

- `NOT_FOUND` (404)
