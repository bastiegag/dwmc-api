# Backend Architecture

## Request Lifecycle

```text
HTTP request
-> request body limit
-> security headers
-> CORS middleware
-> request logger
-> route match
-> Zod validation
-> auth middleware for protected routes
-> service
-> repository
-> response helper
-> centralized error handler
```

`src/app.ts` registers middleware, public health/readiness endpoints, error handling, and the `/api/v1` routers. `src/server.ts` starts the Node.js HTTP server.

The application supports local development and production. There is one
production backend and no dedicated staging environment. The API rejects
request bodies larger than 1 MiB with `413` and adds standard security headers
before route handling. Request logs include a request ID, method, path, status,
and duration; startup logs report the environment and bound port.

## Production Infrastructure Boundary

The production environment is the only deployed environment currently
configured for this repository:

| Concern    | Production                     |
| ---------- | ------------------------------ |
| Git branch | `main`                         |
| Backend    | Render production Web Service  |
| Database   | Supabase production PostgreSQL |
| Frontend   | Vercel production deployment   |

CI (`.github/workflows/ci.yml`) validates pull requests targeting `main` and
pushes to `main`; it never touches a database. The production migration
workflow (`.github/workflows/deploy-production.yml`) applies committed
migrations only after CI succeeds, using the GitHub `production` Environment
to select the `DATABASE_URL` secret. See [releasing](RELEASING.md) for the
full pipeline and [database](database.md#migrations) for migration ownership.

## Module Boundaries

Each domain module under `src/modules/<name>/` owns its route, schema, service, and repository files where those layers are needed.

| Layer        | Responsibility                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Routes       | HTTP paths, middleware, parsing, service delegation, and response status.                       |
| Schemas      | Zod request/query/param validation and inferred input types.                                    |
| Services     | Business rules, ownership resolution, orchestration, serialization, and `AppError`.             |
| Repositories | Prisma queries scoped to the resolved `UserProfile.id`; no HTTP concerns.                       |
| Shared       | Error handling, response envelopes, validation helpers, pagination, logging, and money helpers. |

Routes stay thin. Do not put financial rules in route handlers or HTTP formatting in repositories.

## Runtime Lifecycle

The server binds to `0.0.0.0` and uses Render's `PORT` value, falling back to
`3000` locally. It closes the HTTP server and Prisma client on `SIGTERM` and
`SIGINT`. The process is stateless; persistent data belongs in Supabase.

## Money Arithmetic

Persisted monetary values use two decimal places. When the API calculates derived balances, it
converts each operand to integer cents, performs the calculation with `bigint`, and serializes the
result back to a number at the response boundary. This avoids binary floating-point accumulation
while preserving the existing JSON contract. Inputs beyond two decimal places are rounded to the
nearest cent before aggregation.

## Current Modules

- `auth`: token middleware, profile synchronization, and `/auth/me`.
- `sections` and `categories`: two-level spending classification with archive behavior.
- `accounts`: account CRUD and computed current balances.
- `transactions`: typed financial movements with offset pagination.
- `budgets`: monthly category budgets and expense progress.
- `summary`: monthly totals, category/account breakdowns, and recent transactions.

## Ownership Boundary

Supabase identifies the authenticated user. Services resolve or create the local `UserProfile`, then every repository query uses that profile ID. Frontend visibility and route protection are not authorization; backend ownership checks remain mandatory.

## Adding a Module

Before adding a module, inspect the sibling frontend if the feature is user-facing. Add the route, schema, service, repository, tests, database model/migration when required, API documentation, and frontend contract changes together. Register a new router in `src/app.ts` under `/api/v1` and keep ownership checks explicit.
