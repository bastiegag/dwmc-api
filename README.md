# Dude, Where's My Cash? API

`dwmc-api` is the local Hono/TypeScript backend for DWMC, a personal budgeting application. It validates Supabase Auth access tokens, enforces ownership, and persists domain data with Prisma in local PostgreSQL.

## Architecture

```text
Browser -> dwmc-web (local) -> dwmc-api (local) -> Prisma -> PostgreSQL (local)
                \-> Supabase Auth (remote) -> access token -> dwmc-api
```

Supabase is used for authentication only. `UserProfile.authUserId` links the authenticated Supabase user to local application records. The API never uses Supabase PostgreSQL for domain data.

## Prerequisites

- Node.js 24.x
- npm
- Docker and Docker Compose for local PostgreSQL
- A Supabase project with Auth enabled

## Setup

```bash
npm ci
cp .env.example .env
# Set the local DATABASE_URL and Supabase Auth values.
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

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

## Documentation

- [Architecture](docs/architecture.md)
- [API design](docs/api.md)
- [Authentication](docs/domains/auth.md)
- [Database](docs/database.md)
- [Testing](docs/testing.md)
- [Development and releases](docs/RELEASING.md)
- [Domain documentation](docs/domains/)
