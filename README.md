# Dude, Where's My Cash? API

`dwmc-api` is the Hono/TypeScript backend for Dude, Where's My Cash?, a personal budgeting application. It validates Supabase access tokens, applies user ownership rules, persists domain data with Prisma/PostgreSQL, and calculates account, budget, and monthly-summary values.

## Stack

The versions and scripts are maintained in [`package.json`](package.json). The backend uses Node.js, TypeScript, Hono, Prisma, PostgreSQL, Zod, Supabase Auth, Vitest, ESLint, Prettier, Husky, and Changesets.

## Architecture

The request path is:

```text
Hono route
-> Zod parsing
-> auth middleware where required
-> service business rules
-> repository Prisma query
-> response helper
```

See [architecture](docs/architecture.md) and [database](docs/database.md).

## Getting Started

Prerequisites:

- Node.js 24.x.
- Docker and Docker Compose for local PostgreSQL.
- A Supabase project.

```bash
npm install
cp .env.example .env
# Fill in the required Supabase and database values.
docker compose up -d
npm run db:migrate
npm run dev
```

The development server listens on port `3000` by default. The frontend repository's Vite development server proxies `/api/v1` to this server.

See the package scripts and [releasing](docs/RELEASING.md) for migration and
validation guidance. `main` is the production branch; feature branches target
it by pull request. The supported environments are local development and
production; there is no dedicated staging environment.

## Render Deployment

The production API is intended to run as a stateless Render Free Web Service.
Render hosts the Node.js process, Supabase hosts PostgreSQL, and Supabase Auth
continues to issue and validate browser access tokens. Configure `APP_ORIGIN`
with the exact Vercel production origin; do not use `*` in production.

Use these Render commands:

```bash
# Build Command
npm ci --include=dev && npm run db:generate && npm run build

# Start Command
npm start
```

Use `/health` as the Render Health Check Path. GitHub Actions automatically
runs `npm run db:migrate:deploy` against the production Supabase project after
CI succeeds on `main`; see [releasing](docs/RELEASING.md) for the full
pipeline, migration failure behavior, and the Render ordering caveat.
Migrations are never run by the Render start command.

## Environment Variables

The validated backend variables are:

| Variable            | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `NODE_ENV`          | `development`, `test`, or `production`.                       |
| `PORT`              | HTTP port, default `3000`.                                    |
| `APP_ORIGIN`        | Allowed CORS origin.                                          |
| `DATABASE_URL`      | PostgreSQL connection string.                                 |
| `SUPABASE_URL`      | Supabase project URL.                                         |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key used for Auth token validation. |

The backend does not require a Supabase service-role key. Never commit real credentials.

## API

The public API namespace is `/api/v1`. Public endpoints are `GET /health` and `GET /ready`. Authenticated resources are auth profile bootstrap, sections, categories, accounts, transactions, monthly summary, and budgets. Authentication behavior is documented in [domains/auth.md](docs/domains/auth.md).

See [API design](docs/api.md) for the endpoint inventory and response contract. The frontend consumption pattern is documented in `dwmc-web/docs/api.md` in the sibling repository.

## Database

The Prisma schema contains `UserProfile`, `Section`, `Category`, `Account`, `Transaction`, and `Budget`. All business records are scoped to `UserProfile`. See [database](docs/database.md).

## Testing

Tests use Vitest with mocked Prisma and Supabase dependencies, so the normal test suite does not require a live database or real credentials. See [testing](docs/testing.md).

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

## Scripts

| Command                     | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `npm run dev`               | Start the watch-mode server.                       |
| `npm run build`             | Compile TypeScript to `dist`.                      |
| `npm start`                 | Run the compiled server.                           |
| `npm run typecheck`         | Type-check without emitting.                       |
| `npm run lint`              | Run ESLint with zero warnings.                     |
| `npm run format:check`      | Check Prettier formatting.                         |
| `npm run test`              | Run Vitest once.                                   |
| `npm run validate`          | Run formatting, lint, typecheck, tests, and build. |
| `npm run db:generate`       | Generate the Prisma client.                        |
| `npm run db:migrate`        | Run Prisma development migrations.                 |
| `npm run db:migrate:deploy` | Apply committed migrations in production.          |
| `npm run db:studio`         | Open Prisma Studio.                                |
| `npm run db:reset`          | Reset the database and rerun migrations.           |
| `npm run db:seed`           | Run the development seed script.                   |

## Documentation

- [Architecture](docs/architecture.md)
- [API design](docs/api.md)
- [Authentication](docs/domains/auth.md)
- [Database](docs/database.md)
- [Testing](docs/testing.md)
- [Accounts](docs/domains/accounts.md)
- [Budgets](docs/domains/budgets.md)
- [Categories and sections](docs/domains/categories.md)
- [Monthly summary](docs/domains/summary.md)
- [Transactions](docs/domains/transactions.md)
- [Releasing](docs/RELEASING.md)
