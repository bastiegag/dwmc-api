# Database

## Provider and Ownership

The application uses local PostgreSQL through Prisma. `DATABASE_URL` is the
Prisma connection string for that local database. Supabase Auth is separate:
`UserProfile.authUserId` uniquely links a local profile to a Supabase Auth user.
Every business model is scoped to `UserProfile.id`.

## Models

The schema contains `UserProfile`, `Section`, `Category`, `Account`,
`Transaction`, and `Budget`. Relationships, indexes, constraints, archive
behavior, and Decimal fields are authoritative in `prisma/schema.prisma`.

## Local Setup

Docker Compose starts PostgreSQL with the development database `dwmc_api`, user
`postgres`, password `postgres`, and port `5432`. A matching example URL is:

```text
postgresql://postgres:postgres@localhost:5432/dwmc_api?schema=public
```

Do not put real credentials in committed files. You may use another local
PostgreSQL installation by changing `DATABASE_URL` in `.env`.

Integration tests use a separate database named exactly `dwmc_api_test`.
`npm run test:integration` validates the URL, checks whether this database
exists, creates it only when absent, and applies committed migrations with
`prisma migrate deploy`. It never drops, resets, truncates, or modifies
`dwmc_api`. The runner requires `DWMC_INTEGRATION_TEST=1` for destructive test
operations and rejects production or remote database configurations. The
PostgreSQL role must have `CREATEDB` permission for automatic initialization;
if it does not, create `dwmc_api_test` with an appropriately privileged local
role before running the suite. CI provides the flag and creates the database
in its isolated PostgreSQL service.

Monetary API values reject null, blank strings, booleans, arrays, non-finite
numbers, values outside `Decimal(12,2)`, and values with more than two decimal
places. Numeric strings, zero where allowed, and negative adjustments remain
supported.

Financial columns use PostgreSQL `Decimal(12,2)`. API monetary inputs must be
finite, within the `Decimal(12,2)` range, and have no more than two decimal
places. Account adjustments may be negative; income, expenses, transfers, and
budgets follow their type-specific non-negative or positive rules.

## Migration Workflow

Migration history is committed under `prisma/migrations`.

```bash
npm run db:generate
npm run db:migrate       # create/apply a local development migration
npm run db:studio
npm run db:reset         # destructive local reset
npm run db:seed
```

Edit the schema, run `npm run db:migrate`, regenerate the client when needed,
and commit the schema and migration together. CI validates code but does not
connect to a database or apply migrations remotely.
