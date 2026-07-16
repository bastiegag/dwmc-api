# dwmc-api

A modern, production-minded REST API backend for a personal budget application.

## Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Runtime    | Node.js + TypeScript (strict)  |
| Framework  | Hono                           |
| ORM        | Prisma                         |
| Database   | PostgreSQL (local via Docker)  |
| Validation | Zod                            |
| Auth       | Supabase Auth (JWT validation) |
| Testing    | Vitest                         |
| Linting    | ESLint 9 (flat config)         |
| Formatting | Prettier                       |

## Project structure

```
src/
  app.ts              # Hono app: middleware, error handler, routes
  server.ts           # Node.js entry point (starts HTTP server)

  config/
    env.ts            # Zod-validated environment variables (fail-fast)

  db/
    prisma.ts         # Prisma client singleton

  lib/
    supabase.ts       # Backend Supabase client (service role)

  modules/
    auth/
      auth.routes.ts      # GET /api/v1/auth/me
      auth.middleware.ts  # JWT validation middleware
      auth.service.ts     # Business logic (upsert UserProfile)
      auth.schema.ts      # Zod schemas for auth types
    sections/
      section.routes.ts
      section.schema.ts
      section.service.ts
      section.repository.ts
    categories/
      category.routes.ts
      category.schema.ts
      category.service.ts
      category.repository.ts
    budgets/
      budget.routes.ts
      budget.schema.ts
      budget.service.ts
      budget.repository.ts
    accounts/
      account.routes.ts
      account.schema.ts
      account.service.ts
      account.repository.ts
    transactions/
      transaction.routes.ts
      transaction.schema.ts
      transaction.service.ts
      transaction.repository.ts
    summary/
      summary.routes.ts
      summary.schema.ts
      summary.service.ts
      summary.repository.ts

  shared/
    errors/
      AppError.ts         # Typed application error class
      error-handler.ts    # Central Hono onError handler
    http/
      api-response.ts     # successResponse / errorResponse helpers
    validation/
      validate.ts         # Reusable Zod body validator
    logger/
      request-logger.ts   # Request/response logger middleware

  types/
    app.ts            # AppBindings, AuthUser (Hono context types)

  tests/
    setup.ts              # Global test env setup
    health.test.ts
    readiness.test.ts
    auth.test.ts
    error-handler.test.ts

prisma/
  schema.prisma       # Database schema
  seed.ts             # Development seed script

docs/
  architecture.md
  api.md
  auth.md
  accounts.md
  budgets.md
  categories.md
  conventions.md
  local-development.md
  RELEASING.md
  summary.md
  transactions.md
```

## Quick start

### 1. Prerequisites

- Node.js 20+
- Docker + Docker Compose
- A [Supabase](https://supabase.com) project (free tier is fine)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials. See `docs/auth.md` for details on which keys to use.

### 4. Start PostgreSQL

```bash
docker compose up -d
```

### 5. Run Prisma migrations

```bash
npm run db:migrate
```

### 6. Start the dev server

```bash
npm run dev
```

The server starts at `http://localhost:3000`.

## Authentication

The frontend sends the Supabase access token in every protected request:

```
Authorization: ******
```

The backend validates the token with Supabase, extracts the user identity, and attaches it to the Hono context. See `docs/auth.md` for the full flow.

## API endpoints

| Method | Path                   | Auth     | Description                    |
| ------ | ---------------------- | -------- | ------------------------------ |
| GET    | /health                | public   | Liveness check                 |
| GET    | /ready                 | public   | Readiness check (DB ping)      |
| GET    | /api/v1/auth/me        | required | Current user + profile         |
| GET    | /api/v1/sections       | required | List sections                  |
| POST   | /api/v1/sections       | required | Create section                 |
| GET    | /api/v1/sections/:id   | required | Get section by id              |
| PATCH  | /api/v1/sections/:id   | required | Update section                 |
| DELETE | /api/v1/sections/:id   | required | Archive section (soft delete)  |
| GET    | /api/v1/categories     | required | List categories                |
| POST   | /api/v1/categories     | required | Create category                |
| GET    | /api/v1/categories/:id | required | Get category by id             |
| PATCH  | /api/v1/categories/:id | required | Update category                |
| DELETE | /api/v1/categories/:id | required | Archive category (soft delete) |
| GET    | /api/v1/accounts       | required | List accounts                  |
| POST   | /api/v1/accounts       | required | Create account                 |
| GET    | /api/v1/accounts/:id   | required | Get account by id              |
| PATCH  | /api/v1/accounts/:id   | required | Update account                 |
| DELETE | /api/v1/accounts/:id   | required | Archive account (soft delete)  |

See `docs/api.md` for request/response details.

## Releases

Backend releases use Semantic Versioning, Changesets, Conventional Commits, Git tags, and GitHub Releases. The backend package version is independent from the frontend repository version, and the public HTTP contract stays on `/api/v1` unless a deliberate breaking API migration is introduced.

The release workflow in `.github/workflows/release.yml` runs `npm run validate` on pushes to `main`, then lets Changesets create or update the release PR, tags, and GitHub Release notes.

See [docs/RELEASING.md](docs/RELEASING.md) for the full workflow.

## Scripts

| Script                  | Description                                 |
| ----------------------- | ------------------------------------------- |
| `npm run dev`           | Start dev server with hot reload            |
| `npm run build`         | Compile TypeScript to `dist/`               |
| `npm start`             | Run compiled server                         |
| `npm run typecheck`     | Type-check without emitting                 |
| `npm run lint`          | ESLint (zero warnings)                      |
| `npm run lint:fix`      | ESLint with auto-fix                        |
| `npm run format`        | Prettier write                              |
| `npm run format:check`  | Prettier check                              |
| `npm run validate`      | Format check, lint, typecheck, tests, build |
| `npm test`              | Run tests once                              |
| `npm run test:watch`    | Run tests in watch mode                     |
| `npm run test:coverage` | Test coverage report                        |
| `npm run db:generate`   | Regenerate Prisma client                    |
| `npm run db:migrate`    | Run pending migrations                      |
| `npm run db:studio`     | Open Prisma Studio                          |
| `npm run db:reset`      | Reset and re-seed the database              |
| `npm run db:seed`       | Run seed script                             |

## Current modules

- `auth` — Supabase JWT validation and profile bootstrap. See `docs/auth.md`.
- `sections` — top-level budget groupings. See `docs/categories.md` and `docs/architecture.md`.
- `categories` — child budget labels scoped to sections. See `docs/categories.md`.
- `accounts` — balance-tracking accounts with computed balances. See `docs/accounts.md`.
- `budgets` — monthly spending limits by category. See `docs/budgets.md`.
- `transactions` — record income, expenses, transfers, and adjustments. See `docs/transactions.md`.
- `summary` — monthly financial rollups and recent activity. See `docs/summary.md`.

## Future ideas

- `recurring` — recurring transaction rules
- `reports` — aggregated summaries

See `docs/architecture.md` for how to add a new module.
