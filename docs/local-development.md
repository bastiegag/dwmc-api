# Local Development

## Prerequisites

- Node.js 20 or later.
- Docker and Docker Compose.
- A Supabase project.

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run dev
```

The API listens on `http://localhost:3000` by default. The frontend Vite server runs separately and proxies `/api/v1` to this port.

## Environment

Fill in the Supabase values in `.env`. `DATABASE_URL` should match the Docker Compose PostgreSQL defaults unless you use another database. Startup validates all variables through `src/config/env.ts` and exits when required values are missing or malformed.

## Database Commands

| Command               | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `npm run db:generate` | Regenerate the Prisma client.            |
| `npm run db:migrate`  | Create/apply development migrations.     |
| `npm run db:studio`   | Open Prisma Studio.                      |
| `npm run db:reset`    | Reset the database and rerun migrations. |
| `npm run db:seed`     | Run `prisma/seed.ts`.                    |

After changing `prisma/schema.prisma`, generate the client and create a migration before building or running the server. Do not reset a shared or production database as a normal development step.

## Quality Checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run validate` runs the complete sequence. Tests use mocked Prisma and Supabase dependencies and do not require a running database or real credentials.
