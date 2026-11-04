# Development

## Prerequisites

- Node.js 24.x
- npm
- Docker and Docker Compose
- A Supabase project with Auth enabled

## Local workflow

```bash
npm ci
cp .env.example .env
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Set `NODE_ENV=development`, the local `DATABASE_URL`, `APP_ORIGIN`,
`SUPABASE_URL`, and `SUPABASE_ANON_KEY` in `.env`. Use only the publishable
Supabase anon key; never use or commit a service-role key.

The API listens on `http://localhost:3000`. `GET /health` and `GET /ready` are
public; authenticated resources are under `/api/v1`.

## Commands

| Command               | Purpose                                                |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Start the development server with reload               |
| `npm run validate`    | Run formatting, lint, typecheck, unit tests, and build |
| `npm run db:generate` | Generate the Prisma client                             |
| `npm run db:migrate`  | Create/apply a local development migration             |
| `npm run db:studio`   | Open Prisma Studio                                     |
| `npm run db:reset`    | Reset the local development database                   |
| `npm run db:seed`     | Seed development data                                  |

`db:reset` is destructive and is only for the local development database.
Integration database operations use the separate guarded workflow documented in
[Testing](testing.md).

## Conventions

Domain modules under `src/modules/<name>/` keep routes, schemas, services, and
repositories together. Routes handle HTTP, schemas validate input, services
enforce business rules and serialization, and repositories own Prisma queries.
Use the existing response, error, naming, and testing conventions before
introducing a new abstraction.

## Environment and secrets

`.env` is local-only and ignored by Git. Do not print or commit database
credentials, Supabase secrets, or production configuration. The backend uses
Supabase only for authentication; application data remains in local
PostgreSQL.
