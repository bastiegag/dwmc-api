# Copilot Instructions for `dwmc-api`

## Context

This is the TypeScript/Hono backend for Dude, Where's My Cash?. It uses Prisma with PostgreSQL, Zod validation, Supabase Auth token validation, Vitest, ESLint, Prettier, Husky, and Changesets. Verify versions and scripts in `package.json`.

The sibling `../dwmc-web` repository consumes this API. When changing an API contract consumed by the frontend, inspect `../dwmc-web` when available and identify the required client, query, UI, and documentation changes. Do not silently create an incompatible contract.

## Architecture

- Keep HTTP concerns in `src/app.ts` and module `*.routes.ts` files.
- Keep request schemas and inferred inputs in `*.schema.ts`.
- Keep business rules, ownership resolution, calculations, and serialization in `*.service.ts`.
- Keep Prisma queries in `*.repository.ts`.
- Keep shared error, response, validation, pagination, money, and logging behavior under `src/shared`.
- Register routes under `/api/v1` in `src/app.ts`.

Routes must stay thin. Do not put financial rules in repositories or raw Prisma queries in route handlers.

## Validation and Errors

Use Zod schemas with `validateBody` for JSON bodies and `parseOrThrow` for params/query strings. Throw `AppError` for expected failures. Never expose raw Prisma or Supabase errors. Use the response helpers in `src/shared/http/api-response.ts` for success, pagination, and errors.

The public error codes are `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, and `INTERNAL_SERVER_ERROR`. Verify individual status behavior in source and tests before documenting or changing it.

## Authentication and Ownership

Protected routes use `authMiddleware`, which validates `Authorization: Bearer <Supabase access token>` with Supabase and sets `authUser`. Services resolve or create the local `UserProfile`; every query and mutation for user-owned data must be scoped to its `userProfileId`. Frontend route visibility is never authorization.

Never expose `SUPABASE_SERVICE_ROLE_KEY`, log tokens, or trust client-supplied ownership IDs.

## Prisma, Money, and Dates

- Read environment variables only through `src/config/env.ts`.
- Keep Prisma access in repositories.
- Run migrations for schema changes and regenerate the Prisma client.
- Use `isArchived: true` for archive operations; do not hard-delete through current resource DELETE routes.
- Serialize Prisma Decimal values to JSON numbers in services.
- Use `YYYY-MM` for month values and UTC start-inclusive/end-exclusive month ranges.
- Preserve the current transaction type rules and account/budget/summary calculations.

## Testing

Use Vitest and the existing mocked Prisma/Supabase setup. Test HTTP status codes, envelopes, validation, authentication, ownership isolation, archive behavior, month boundaries, money calculations, budgets, summaries, and regressions. Do not add a test framework or require live credentials in the default suite without documenting the exception.

## Migrations and Documentation

After schema changes, use the repository's Prisma scripts and document migration implications. Keep `README.md` concise and update the relevant file under `docs/` for API, auth, database, architecture, testing, observability, release, or module behavior changes. Treat code, schemas, tests, and workflows as the source of truth. Never document planned behavior as implemented.
