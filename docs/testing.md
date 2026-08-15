# Backend Testing

## Stack and Setup

Vitest runs the backend tests. Tests live under `src/tests/` and use `src/tests/setup.ts`. Prisma and Supabase are mocked with `vi.mock()`, so the normal suite does not need a running database or real Supabase credentials.

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
npm run test:watch
npm run test:coverage
npm run typecheck
npm run lint
npm run build
npm run validate
```

A test requiring a live database or real token must document that requirement explicitly and must not silently become part of the mocked default suite.
