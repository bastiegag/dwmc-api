# Backend Conventions

## Naming and Structure

- Files use kebab-case, such as `transaction.service.ts`.
- Classes, types, and interfaces use PascalCase.
- Functions and variables use camelCase.
- Zod schemas use camelCase with a `Schema` suffix.
- Domain modules live under `src/modules/<name>/`.
- Use `import type` for type-only imports.
- Keep environment access in `src/config/env.ts`; do not read `process.env` in application modules.

## Validation

Define request schemas in `*.schema.ts`. Use `validateBody(c, schema)` for JSON bodies and `parseOrThrow(schema, input)` for params and query strings. Validation failures become `AppError` responses with the standard error envelope. Some domain checks intentionally use a specific status, such as an invalid related section returning `400`; do not normalize statuses without checking the service and tests.

## Errors and Responses

Services and middleware throw `AppError` with one of `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, or `INTERNAL_SERVER_ERROR`. The central handler prevents raw Prisma or Supabase errors from becoming the public contract.

Use response helpers from `src/shared/http/api-response.ts`:

- `successResponse(data)` for ordinary success responses.
- `paginatedResponse(items, nextCursor)` for sections and categories.
- `paginatedMetaResponse(items, meta)` for transactions.
- `errorResponse(...)` when an explicit route-level error response is required.

## Persistence and Ownership

Every query on a user-owned table must include the authenticated user's `userProfileId`. Use services to resolve ownership and repositories to apply the Prisma filter. Archive domain records with `isArchived: true`; `DELETE` endpoints are archive operations, not hard deletes. Archiving a section also archives its categories.

Prisma `Decimal` fields are serialized to JSON numbers in services. Dates returned by services are ISO strings. Do not expose raw Prisma Decimal instances.

## Dates and Money

Use `YYYY-MM` for month values. Monthly ranges are UTC-based with an inclusive start and exclusive next-month boundary. Do not introduce ambiguous local-time month calculations. Transaction amounts are positive for income, expense, and transfer movements; adjustments may be negative, zero, or positive. See [transactions](transactions.md), [accounts](accounts.md), and [database](database.md).

## Tests

Tests live in `src/tests/`, mock Prisma and Supabase with Vitest, clear mocks between cases, and assert HTTP status and response envelopes. Prioritize ownership, validation, archive behavior, month boundaries, calculations, and regressions.
