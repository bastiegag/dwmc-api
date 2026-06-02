# Copilot Instructions — dwmc-api

Trust these instructions. Only search the codebase if the information here is incomplete or appears to be in error.

---

## Project Summary

`dwmc-api` is a REST API backend for a personal budget application. It is built with **Node.js + TypeScript (strict mode)**, the **Hono** web framework, **Prisma** ORM, **PostgreSQL**, **Zod** for validation, and **Supabase Auth** (JWT) for authentication. Tests run with **Vitest**. There is no CI pipeline file in the repository — validation is done locally.

---

## Runtime & Tooling Versions

- **Node.js**: 20+
- **TypeScript**: ^5.7 (target ES2022, module NodeNext)
- **Package manager**: npm (use `npm`, never `yarn` or `pnpm`)
- **Prisma**: ^5.22
- **Hono**: ^4.6
- **Vitest**: ^4.1
- **ESLint**: 9 flat config
- **Prettier**: ^3.4

---

## Repository Layout

```
.env.example             # Environment variable template
docker-compose.yml       # PostgreSQL local database
eslint.config.js         # ESLint 9 flat config (typescript-eslint + prettier)
prettier.config.js       # Prettier config (no semi, single quotes, trailing commas)
tsconfig.json            # Strict TypeScript, NodeNext modules, rootDir=src outDir=dist
vitest.config.ts         # Vitest config — setupFiles: src/tests/setup.ts
package.json             # All scripts listed below
prisma/
  schema.prisma          # Database schema (UserProfile, Section, Category)
  seed.ts                # Dev seed script
  migrations/            # Prisma migration history
src/
  server.ts              # Node.js HTTP entry point
  app.ts                 # Hono app: middleware, error handler, route registration
  config/env.ts          # Zod-validated env vars — ONLY place to read process.env
  db/prisma.ts           # Prisma client singleton
  lib/supabase.ts        # Supabase backend client (service role)
  types/app.ts           # AppBindings, AuthUser (Hono context types)
  modules/
    auth/                # auth.routes.ts, auth.middleware.ts, auth.service.ts, auth.schema.ts
    sections/            # section.routes.ts, section.schema.ts, section.service.ts, section.repository.ts
    categories/          # category.routes.ts, category.schema.ts, category.service.ts, category.repository.ts
  shared/
    errors/AppError.ts         # Typed AppError class + ErrorCode type
    errors/error-handler.ts    # Central Hono onError handler
    http/api-response.ts       # successResponse / errorResponse helpers
    validation/validate.ts     # Reusable Zod body validator
    logger/request-logger.ts   # Request/response logger middleware
  tests/
    setup.ts             # Sets env vars so tests run without a real .env
    health.test.ts
    readiness.test.ts
    auth.test.ts
    error-handler.test.ts
docs/
  architecture.md        # Request lifecycle, layer responsibilities, how to add a module
  conventions.md         # Naming, module structure, error handling, testing rules
  api.md                 # Request/response details for all endpoints
  auth.md                # Supabase JWT flow
  local-development.md   # Local setup guide
  categories.md          # Categories module detail
```

---

## Build & Validation Steps

Always run these in order after making changes:

```bash
# 1. Install dependencies (always do this first after any package.json change)
npm install

# 2. Type-check (no output emitted)
npm run typecheck

# 3. Lint — zero warnings allowed
npm run lint

# 4. Format check
npm run format:check

# 5. Run tests — no database required, all external deps are mocked
npm test
```

To compile to `dist/`:
```bash
npm run build
```

To auto-fix lint and format issues:
```bash
npm run lint:fix
npm run format
```

**Tests do not require a running database or real Supabase credentials.** `src/tests/setup.ts` injects stub env vars, and each test file mocks Prisma and Supabase with `vi.mock()`. Simply run `npm test`.

---

## Database (only needed to run the server locally, not for tests)

```bash
docker compose up -d          # Start PostgreSQL
npm run db:migrate             # Run pending Prisma migrations
npm run db:generate            # Regenerate Prisma client after schema changes
npm run db:seed                # Seed dev data
```

After modifying `prisma/schema.prisma`, always run `npm run db:generate` (or `npm run db:migrate` for a new migration) before building or type-checking.

---

## Architecture & Conventions

**Module structure** — every domain module in `src/modules/<name>/` has exactly four files:
- `<name>.routes.ts` — thin Hono router; validates input, calls service, returns response
- `<name>.schema.ts` — Zod schemas and inferred types
- `<name>.service.ts` — business logic; throws `AppError`; never raw Prisma/Supabase errors
- `<name>.repository.ts` — Prisma queries only; always scoped by `userProfileId`

**To add a new module:**
1. Create `src/modules/<name>/` with the four files above.
2. Register the router in `src/app.ts`: `app.route('/api/v1/<name>', <name>Routes)`
3. Protect routes with `authMiddleware`.
4. Add the Prisma model to `prisma/schema.prisma` referencing `UserProfile.id`.
5. Run `npm run db:migrate` and `npm run db:generate`.

**Error handling:**
- Always throw `new AppError('NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_ERROR' | 'CONFLICT' | 'INTERNAL_SERVER_ERROR', message, statusCode)`.
- Never let Prisma or Supabase errors propagate raw to the client.
- The central handler in `src/shared/errors/error-handler.ts` converts `AppError` to the standard envelope.

**API responses:** always use `successResponse(data)` and `errorResponse(code, message)` from `src/shared/http/api-response.ts`. Never construct raw `{ data: … }` or `{ error: … }` objects.

**User data scoping:** every query on user-owned tables **must** include `where: { userProfileId: profile.id }`. Never query without this filter.

**Soft delete:** use `isArchived: true` instead of hard deletes. Archiving a Section also archives its child Categories.

**Environment variables:** never read `process.env` directly in application code. All env access goes through `src/config/env.ts`.

**TypeScript:** strict mode is on. Use `import type { … }` for type-only imports. Avoid `as any` outside test files. `noUncheckedIndexedAccess` is enabled — array/map accesses may be `T | undefined`.

**Naming:**
- Files: `kebab-case` (e.g. `auth.middleware.ts`)
- Classes/Types/Interfaces: `PascalCase`
- Functions/Variables: `camelCase`
- Zod schemas: `camelCase` + `Schema` suffix (e.g. `createSectionSchema`)

**Prettier config:** no semicolons, single quotes, trailing commas, print width 100, tab width 2.

**Testing:** mock Prisma and Supabase with `vi.mock()` per test file. Use `vi.clearAllMocks()` in `beforeEach`. Test files live in `src/tests/`. Test the HTTP layer (status codes, response shapes). Skip any tests requiring a live Supabase token with `it.skip` and add a comment explaining the requirement.
