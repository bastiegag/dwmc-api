# Local Development

## Prerequisites

- [Node.js](https://nodejs.org) 20 or later
- [Docker](https://www.docker.com) + Docker Compose
- A [Supabase](https://supabase.com) project

---

## 1. Clone and install

```bash
git clone <repo-url>
cd dwmc-api
npm install
```

---

## 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable                    | Where to find it                                                 |
| --------------------------- | ---------------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase Dashboard → Project Settings → API → Project URL        |
| `SUPABASE_ANON_KEY`         | Supabase Dashboard → Project Settings → API → `anon` key         |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` key |

Leave `DATABASE_URL`, `PORT`, `APP_ORIGIN`, and `NODE_ENV` at their defaults for local development.

---

## 3. Start PostgreSQL with Docker Compose

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port 5432 with:

- User: `postgres`
- Password: `postgres`
- Database: `dwmc_api`

Data is persisted in a Docker volume (`postgres_data`) so it survives container restarts.

To stop the database:

```bash
docker compose down
```

To stop and delete all data:

```bash
docker compose down -v
```

---

## 4. Run Prisma migrations

```bash
npm run db:migrate
```

This creates all tables defined in `prisma/schema.prisma`.

To generate the Prisma client after schema changes:

```bash
npm run db:generate
```

To open Prisma Studio (visual database browser):

```bash
npm run db:studio
```

---

## 5. Start the dev server

```bash
npm run dev
```

The server starts at `http://localhost:3000` with hot reload via `tsx watch`.

---

## Prisma command reference

| Command               | Description                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `npm run db:generate` | Regenerate Prisma client from schema                               |
| `npm run db:migrate`  | Apply pending migrations (creates new migration if schema changed) |
| `npm run db:studio`   | Open Prisma Studio on `http://localhost:5555`                      |
| `npm run db:reset`    | Drop all tables, re-run migrations, re-seed                        |
| `npm run db:seed`     | Run `prisma/seed.ts` only                                          |

---

## Troubleshooting

### "Can't reach database server"

Make sure the Docker container is running:

```bash
docker compose ps
docker compose up -d
```

### "Environment variable not found"

Make sure you copied `.env.example` to `.env` and filled in all required values.
The app exits immediately at startup if any variable is missing.

### "Port 5432 already in use"

Another PostgreSQL instance is running. Stop it, or change the host port in
`docker-compose.yml`:

```yaml
ports:
    - '5433:5432' # map to host port 5433 instead
```

Then update `DATABASE_URL` in `.env` accordingly.

### Prisma client is out of date

After pulling changes that include schema modifications:

```bash
npm run db:migrate     # apply new migrations
npm run db:generate    # regenerate the client
```
