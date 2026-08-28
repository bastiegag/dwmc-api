# Dude, Where's My Cash? API

`dwmc-api` is the local Hono/TypeScript backend for DWMC, a personal budgeting application. It validates Supabase Auth access tokens, enforces ownership, and persists domain data with Prisma in local PostgreSQL.

The companion frontend is [`dwmc-web`](https://github.com/bastiegag/dwmc-web). The web application owns presentation, routing, forms, and API consumption; this repository owns domain rules, authorization, financial data, persistence, and the HTTP contract.

## Responsibilities

- Authenticate requests with Supabase access tokens and resolve the local user profile.
- Validate request payloads and enforce ownership at the API boundary.
- Apply account, category, transaction, budget, profile, and monthly-summary rules.
- Persist application data through Prisma and local PostgreSQL.
- Expose stable response envelopes, pagination, archive behavior, money handling, and error semantics.

## Architecture

```text
Browser -> dwmc-web (local) -> dwmc-api (local) -> Prisma -> PostgreSQL (local)
                \-> Supabase Auth (remote) -> access token -> dwmc-api
```

Supabase is used for authentication only. `UserProfile.authUserId` links the authenticated Supabase user to local application records. The API never uses Supabase PostgreSQL for domain data.

## Stack

Hono, TypeScript, Zod, Prisma, PostgreSQL, Supabase Auth, Vitest, ESLint, and
Prettier. The service is designed for local development in the current V1
workflow; Docker Compose supplies PostgreSQL.

## Prerequisites

- Node.js 24.x
- npm
- Docker and Docker Compose for local PostgreSQL
- A Supabase project with Auth enabled

## Setup

Run these steps from a fresh clone. Supabase is used for Auth only; application
data stays in the local PostgreSQL database started by Docker Compose.

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Before starting the API, set these values in `.env`:

```dotenv
NODE_ENV=development
PORT=3000
APP_ORIGIN=http://localhost:5182
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dwmc_api?schema=public
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<publishable-anon-key>
```

Create a Supabase project with Email provider authentication enabled. In the
Supabase dashboard, add `http://localhost:5182/**` to the Auth redirect URLs so
email confirmation and password recovery can return to the local frontend.
The project URL and publishable anon key are available in the project's API
settings. Never commit `.env` or use a service-role key in this application.

The API listens on `http://localhost:3000`. Public endpoints are `GET /health`
and `GET /ready`; authenticated resources are under `/api/v1`.

## Environment

Required variables are `NODE_ENV`, `PORT`, `APP_ORIGIN`, `DATABASE_URL`,
`SUPABASE_URL`, and `SUPABASE_ANON_KEY`. The example file contains placeholders
only. The backend uses the publishable Supabase anon key with `supabase.auth.getUser`
and does not require a service-role key.

## Commands

```bash
npm run dev
npm run validate
npm run test
npm run db:generate
npm run db:migrate
npm run db:studio
npm run db:reset
npm run db:seed
```

`npm run db:migrate` creates and applies local development migrations. Commit
schema changes and migrations together. Tests mock Prisma and Supabase, so the
normal test suite does not require live credentials or a running database.

`npm run validate` covers formatting, linting, typechecking, tests, and the
production build. The active CI workflow runs the same quality gates for this
repository.

To reset local application data, run `npm run db:reset`; this is destructive.
The optional `npm run db:seed` command creates development records and is not
required for a first run. `npm run db:studio` opens Prisma Studio for the local
database.

## Documentation

- [Architecture](docs/architecture.md)
- [API design](docs/api.md)
- [Authentication](docs/domains/auth.md)
- [Database](docs/database.md)
- [Testing](docs/testing.md)
- [Development and releases](docs/RELEASING.md)
- [Domain documentation](docs/domains/)
- [Frontend repository](https://github.com/bastiegag/dwmc-web)

## License

MIT. See [LICENSE](LICENSE).
