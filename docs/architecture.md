# Architecture

## Runtime

DWMC V1 runs locally. The browser uses the local Vite frontend, which calls the
local Hono API. Prisma connects that API to local PostgreSQL. Supabase is the
only hosted service and is used only for Auth.

```text
Browser
  -> dwmc-web (local Vite)
  -> dwmc-api (local Node.js/Hono)
  -> Prisma
  -> PostgreSQL (local)

Browser -> Supabase Auth -> access token -> dwmc-api JWT verification
```

The server defaults to port `3000`, accepts a configurable `PORT`, and uses
`APP_ORIGIN` for explicit local CORS. Health and readiness endpoints remain
useful for local development and tests.

## Module Boundaries

Each domain module under `src/modules/<name>/` owns its routes, schemas,
services, and repositories. Routes handle HTTP and delegation; schemas validate
inputs; services enforce business rules and ownership; repositories contain
Prisma queries scoped to the resolved `UserProfile.id`.

## Identity and Ownership

Supabase identifies the authenticated user. Auth middleware verifies the access
token, services resolve or create the local `UserProfile` by `authUserId`, and
all business records reference that profile. Frontend route protection is not
a substitute for backend authorization.

## Money and Lifecycle

Persisted monetary values use Prisma Decimal. Derived balances and summaries are
calculated in services and serialized at the response boundary. The server
closes its HTTP and Prisma resources on shutdown signals.

## Current Modules

- `auth`: token middleware, profile synchronization, and `/auth/me`.
- `sections` and `categories`: user-owned classification.
- `accounts`: account CRUD and computed balances.
- `transactions`: income, expense, transfer, and adjustment movements.
- `budgets`: monthly category budgets.
- `summary`: monthly totals and recent transactions.
