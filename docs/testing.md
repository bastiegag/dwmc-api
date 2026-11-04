# Backend Testing

## Stack and Setup

Vitest runs the backend tests. Tests live under `src/tests/` and use `src/tests/setup.ts`. Prisma and Supabase are mocked with `vi.mock()`, so the normal suite does not need a running database or real Supabase credentials.

The separate `src/integration-tests/` suite uses a real PostgreSQL database
with committed Prisma migrations. It requires the exact database name
`dwmc_api_test`, the `DWMC_INTEGRATION_TEST=1` safety flag, and a local
PostgreSQL host. `npm run test:integration` creates the database when missing,
applies migrations, and then runs the suite. The configured role needs
`CREATEDB` permission for first-time initialization; otherwise create the
dedicated database manually. Cleanup is guarded by the same safety checks and
never targets the development database. The suite never uses Supabase. CI
provisions a separate PostgreSQL service and runs the same guarded command.

## Test Priorities

Prioritize:

- authentication and unauthorized requests
- ownership and cross-user isolation
- Zod validation and error envelopes
- archive behavior
- month boundaries and date filters
- transaction type rules
- account balance calculations
- budget expense aggregation
- monthly summary totals and limits
- status codes and response shapes

Tests should exercise the HTTP application boundary where practical rather than coupling only to private implementation details.

## Commands

```bash
npm run test
npm run test:integration
npm run test:watch
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run validate
```

A test requiring a live database or real token must document that requirement explicitly and must not silently become part of the mocked default suite. Financial integration tests use PostgreSQL `Decimal(12,2)` values and assert user ownership, archive filtering, month boundaries, balances, and budget aggregation.
