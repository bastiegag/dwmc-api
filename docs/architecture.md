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

Supabase Auth owns passwords, sign-in, sign-up, recovery, reset, sessions, and
token issuance. The backend validates the bearer token with
`supabase.auth.getUser(token)`, stores `{ id, email }` in the Hono context, and
returns `401` for missing, malformed, invalid, or expired credentials. The
backend never becomes the browser session store.

`UserProfile.authUserId` is unique and is the bridge from the verified Supabase
identity to local records. `GET /api/v1/auth/me` synchronizes the profile.
`GET /api/v1/profile` initializes the current profile when needed, while
profile updates accept only editable name and currency fields. Email and
identity fields remain owned by Supabase.

Authentication proves identity but does not grant access to another user's
records. Every service and repository query is scoped to the resolved
`UserProfile.id`; referenced accounts, categories, and sections must belong to
that same profile.

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

## Domain responsibilities

- **Sections and categories:** user-owned two-level classification. Archiving a
  section archives its child categories; archived records remain available only
  where the API explicitly supports historical references.
- **Accounts:** user-owned financial locations with an optional starting balance
  and positive savings goal. Current balances are calculated rather than stored.
- **Transactions:** income, expense, transfer, and adjustment movements.
  Transfers use distinct source and destination accounts; adjustments are the
  traceable reconciliation mechanism.
- **Budgets:** monthly spending targets for one category, with uniqueness by
  user, category, and month.
- **Summary:** UTC-month activity totals and breakdowns, calculated from
  non-archived transactions.
