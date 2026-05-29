# dwmc-api

A modern, production-minded REST API backend for a personal budget application.
The first real business feature implemented is **user-scoped categories**.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript (strict) |
| Framework | Hono |
| ORM | Prisma |
| Database | PostgreSQL (local via Docker) |
| Validation | Zod |
| Auth | Supabase Auth (JWT validation) |
| Testing | Vitest |
| Linting | ESLint 9 (flat config) |
| Formatting | Prettier |

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
    categories/
      category.routes.ts
      category.schema.ts
      category.service.ts
      category.repository.ts

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
    categories.test.ts
    error-handler.test.ts

prisma/
  schema.prisma       # Database schema
  seed.ts             # Development seed script

docs/
  architecture.md
  api.md
  auth.md
  categories.md
  local-development.md
  conventions.md
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

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | public | Liveness check |
| GET | /ready | public | Readiness check (DB ping) |
| GET | /api/v1/auth/me | required | Current user + profile |
| GET | /api/v1/categories | required | List user categories |
| POST | /api/v1/categories | required | Create user category |
| GET | /api/v1/categories/:id | required | Get one user category |
| PATCH | /api/v1/categories/:id | required | Update one user category |
| DELETE | /api/v1/categories/:id | required | Soft-delete (archive) one user category |

See `docs/api.md` for request/response details.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | ESLint (zero warnings) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Test coverage report |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run pending migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset and re-seed the database |
| `npm run db:seed` | Run seed script |

## Next planned modules

- `transactions` — record income and expenses (next after categories)
- `accounts` — bank accounts / wallets
- `budgets` — monthly spending limits
- `recurring` — recurring transaction rules
- `reports` — aggregated summaries

See `docs/architecture.md` for how to add a new module.
