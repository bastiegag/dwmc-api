# Architecture

## Philosophy

The backend is organised around **vertical modules** — one folder per domain concern
(auth, transactions, budgets, …). Each module owns its routes, validation schemas, business
logic, and database queries. Shared infrastructure (error handling, response formatting,
logging) lives in `src/shared/`.

This structure makes it easy to:

- Reason about a feature in one place.
- Add a new module without touching existing modules.
- Delete a module cleanly if requirements change.

---

## Request lifecycle

```
HTTP request
  → CORS middleware
  → Request logger
  → Route match
      → Zod validation (`validateBody` for request bodies, `parseOrThrow` for params and query)
      → Auth middleware (protected routes only)
      → Service layer  (business logic)
          → Repository  (Prisma queries)
      → successResponse(data) / paginatedResponse(data, nextCursor) / paginatedMetaResponse(data, meta)
  → Error handler (AppError or unknown → errorResponse)
HTTP response
```

---

## Layer responsibilities

| Layer          | File pattern      | Responsibility                                                                                             |
| -------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| **Route**      | `*.routes.ts`     | Declare endpoints, apply middleware, delegate to service, return response. Stays thin — no business logic. |
| **Schema**     | `*.schema.ts`     | Zod schemas for request bodies, query params, and response shapes.                                         |
| **Service**    | `*.service.ts`    | Business logic — orchestrates repositories, enforces rules, raises AppErrors.                              |
| **Repository** | `*.repository.ts` | Prisma queries only — no business logic, no HTTP concerns.                                                 |

---

## How to add a new module

1. Create `src/modules/<name>/` with the standard files:

```
src/modules/transactions/
  transaction.routes.ts
  transaction.schema.ts
  transaction.service.ts
  transaction.repository.ts
```

2. Register the router in `src/app.ts`:

```typescript
import { transactionRoutes } from './modules/transactions/transaction.routes.js'

app.route('/api/v1/transactions', transactionRoutes)
```

3. Protect routes that need authentication:

```typescript
transactionRoutes.get('/', authMiddleware, async (c) => { … })
```

4. Scope all database queries to the authenticated user's `UserProfile.id` — never
   expose another user's data.

---

## User data scoping

Every business table must reference `UserProfile.id` (not `authUserId` directly).
This single rule prevents cross-user data leaks:

```prisma
model Transaction {
  id            String      @id @default(cuid())
  userProfileId String
  userProfile   UserProfile @relation(fields: [userProfileId], references: [id])
  // …
}
```

When a service fetches data it must always filter by the authenticated user:

```typescript
// ✅ Correct
prisma.transaction.findMany({ where: { userProfileId: profile.id } })

// ❌ Wrong — never query without a user filter
prisma.transaction.findMany()
```

---

## Decimal serialization

Prisma returns `Decimal` objects for numeric fields declared with `@db.Decimal(…)`.
These must never be returned raw in API responses. Convert them to JavaScript `number`
using `Number(value)` in the service layer before building the response:

```typescript
// In the service's serialize helper:
const startingBalance = Number(account.startingBalance)
```

`Number()` works with both real `Prisma.Decimal` objects (production) and plain numbers
(test mocks), making it safe to use in both environments.

Computed fields that are not stored in the database (e.g. `currentBalance`) are added
in the same serialize helper and are never persisted.

---

## Pagination

The API uses two pagination shapes, depending on the module.

### Cursor-based pagination

Sections and categories use cursor-based pagination implemented in `src/shared/validation/pagination.ts` and returned with `paginatedResponse`.

- Query params: `cursor` (optional string id) and `limit` (number, default 50, min 1, max 100).
- The server returns `{ data: [...], nextCursor: string | null }`. When `nextCursor` is `null` there are no further pages.
- Clients should pass `cursor=<lastItemId>` to fetch the next page.

Example server-side usage in a route handler:

```typescript
const result = await listSections(authUser, query)
return c.json(paginatedResponse(result.items, result.nextCursor))
```

### Offset-based pagination

Transactions use offset pagination and return `paginatedMetaResponse`.

- Query params: `page` (default `1`) and `pageSize` (default `25`, max `100`).
- The server returns `{ data: [...], meta: { page, pageSize, total, totalPages } }`.
- Clients should increment `page` to fetch the next slice.

Example server-side usage in a route handler:

```typescript
const result = await listTransactions(authUser, query)
return c.json(paginatedMetaResponse(result.items, result.meta))
```

---

## Sections and categories module pattern

- `src/modules/sections/` and `src/modules/categories/` follow the standard layering:
    - `*.routes.ts`: parse params/query/body, apply `authMiddleware`, call service, return `successResponse` for single resources or `paginatedResponse` for list endpoints
    - `*.service.ts`: enforce user ownership rules and business constraints, throw `AppError`
    - `*.repository.ts`: Prisma queries only, always scoped by `userProfileId`
- Services use the authenticated Supabase user (`c.get('authUser')`), resolve the local `UserProfile`, and pass `UserProfile.id` to repositories.
- Both modules use soft delete (`isArchived`) instead of hard delete.
- Archiving a section also archives its child categories to keep data visibility consistent.

## Transactions module pattern

- `src/modules/transactions/` follows the standard layering, but its list endpoint uses offset pagination and returns `paginatedMetaResponse` instead of `paginatedResponse`.
- Transactions are soft-deleted with `isArchived = true` and excluded from list queries unless `includeArchived=true` is requested.
- Transaction responses serialize decimals to numbers and dates to ISO strings in the service layer before returning JSON.

---

## Directory map

```
src/
  app.ts           — Hono app factory
  server.ts        — Node.js HTTP entry point
  config/env.ts    — Zod-validated env (fail-fast on startup)
  db/prisma.ts     — Prisma singleton
  lib/supabase.ts  — Supabase backend client
  types/app.ts     — Hono AppBindings, AuthUser
  shared/          — Cross-cutting infrastructure
  modules/         — Domain modules (one folder per feature)
  tests/           — Integration and unit tests
```

Note: The `transactions` module has been implemented (backend). It follows the standard module pattern and provides endpoints to create, list, update, and archive transactions. Transactions feed the account balance calculation (see `docs/transactions.md`).

Note: The `budgets` module has been implemented (backend). It provides endpoints to create, list, update, get, and archive monthly budgets scoped to the authenticated user. See `docs/budgets.md` for details.
