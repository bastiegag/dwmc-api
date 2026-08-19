# Releasing

`dwmc-api` is versioned independently from `dwmc-web`. The package version, Git tags/GitHub Releases, and public API namespace `/api/v1` are separate concerns.

## Branch Model

`main` is the production branch. Temporary branches (`feature/*`, `fix/*`,
`chore/*`) target `main` by pull request:

```text
feature/* -> PR -> main -> CI -> prisma migrate deploy -> Supabase production
```

## Quality Gate

The backend validation script runs formatting checks, lint, typecheck, Vitest, and the TypeScript build:

```bash
npm run validate
```

The `CI` workflow (`.github/workflows/ci.yml`) runs the equivalent checks on
pull requests targeting `main` and on pushes to `main`. CI never runs a Prisma
migration command and is database-independent.

## Production Architecture

The production request path is:

```text
dwmc-web on Vercel
	-> dwmc-api as a stateless Render Free Web Service
	-> Prisma
	-> Supabase PostgreSQL
```

Supabase Auth remains the authentication provider. The browser sends its
Supabase access token as `Authorization: Bearer <token>`; the API validates it
with its backend Supabase client and enforces ownership in its services and
repositories. Render persistent disks, local files, process memory, and local
sessions are not application storage.

## Render Service

Configure a Render Web Service from `main` after this preparation is merged.
Use Node.js and these exact commands:

```text
Build Command: npm ci --include=dev && npm run db:generate && npm run build
Start Command: npm start
Health Check Path: /health
```

`npm start` runs the compiled `dist/server.js`. The server uses Render's
`PORT`, falls back to `3000` locally, and binds to `0.0.0.0`. Startup logs
report the environment and bound port; request logs include request ID, method,
path, status, and duration. Render Git auto-deploy from `main` is the intended
deployment trigger; GitHub Actions never calls the Render API and remains the
quality and controlled migration workflow rather than a competing deploy
trigger.

Render's free auto-deploy starts as soon as it observes the new commit, which
is independent of and not ordered against the GitHub Actions migration job.
In practice the migration workflow (gated on CI success via `workflow_run`)
usually completes before or around the same time as a Render Free cold build,
but this is **not a guaranteed ordering** on the current free architecture.
Backward-compatible migrations (below) are what actually make this safe, not
deployment sequencing.

Render Free may spin the service down after inactivity, so cold starts are
expected. The service does not require a persistent disk.

## Environment Variables

Set these values in Render. Never commit or print their values:

| Variable            | Required | Secret | Source   | Notes                                                                                |
| ------------------- | -------- | ------ | -------- | ------------------------------------------------------------------------------------ |
| `NODE_ENV`          | Yes      | No     | Render   | Set to `production`.                                                                 |
| `DATABASE_URL`      | Yes      | Yes    | Supabase | PostgreSQL URL for the target Supabase project.                                      |
| `SUPABASE_URL`      | Yes      | No     | Supabase | Project URL used by backend Auth validation.                                         |
| `SUPABASE_ANON_KEY` | Yes      | No     | Supabase | Publishable/anon key used by `supabase.auth.getUser`; it is not an admin credential. |
| `APP_ORIGIN`        | Yes      | No     | Vercel   | Exact frontend origin, such as `https://app.example.com`; no trailing path.          |
| `PORT`              | No       | No     | Render   | Render supplies this automatically. Do not configure it manually.                    |

GitHub Actions reads `DATABASE_URL` from the protected GitHub `production`
Environment. See [database](database.md#supabase-production-connection) for
the migration connection string mode.

## CORS

`APP_ORIGIN` controls the single allowed browser origin. The API explicitly
allows `Authorization` and `Content-Type`, and supports the resource methods
used by the frontend plus OPTIONS preflight. Local development keeps its
localhost origin in `.env`; production must use the Vercel production origin.

Preview Vercel origins are not automatically allowed. If preview access is
needed, introduce an explicit allowlist or deliberate origin matcher; do not
switch production CORS to a wildcard.

The API rejects request bodies larger than 1 MiB with `413` and adds standard
security response headers, including `X-Content-Type-Options` and
`X-Frame-Options`. These protections are applied before route handling.

## Changesets and GitHub Actions

Create a release note with:

```bash
npm run changeset
```

Changesets configuration is present for release notes and versioning, but no
GitHub Actions release workflow is currently configured. The backend is private
and is not published to npm.

Use `npm run version` to consume changesets and update the package/changelog state. `npm run release` is the configured Changesets tag command; it is not an npm publication command.

## Database Migrations

Schema changes require an approved Prisma migration and regenerated client.
Migrations are always created during local development and committed to Git;
GitHub Actions only **applies** committed migrations, it never generates them:

```bash
npm run db:migrate     # development only: creates a new migration
npm run db:generate    # regenerate the Prisma client locally
```

`npm run db:migrate:deploy` (`prisma migrate deploy`) is the production
command. Never use `prisma migrate dev`, `prisma db push`, or `db:reset` /
`prisma migrate reset` against production; those are development-only commands.

### Production Migration Flow

```text
push to main -> CI (quality) -> deploy-production.yml (environment: production)
  -> prisma migrate deploy -> Supabase production -> Render production auto-deploy
```

`.github/workflows/deploy-production.yml` triggers after the `CI` workflow
completes successfully for `main`, uses `environment: production`, and reads
the production `DATABASE_URL` secret. Its `concurrency` group ensures only one
production migration deployment runs at a time; an in-flight migration is
never cancelled because a newer commit arrived.

If `prisma migrate deploy` fails, the workflow fails and stops; GitHub Actions
does not reset the database, mark a migration as resolved, retry destructively,
or perform any further release step. A failed migration requires manual
investigation before the next push is retried.

Render Free does not provide a normal one-off migration job, so the GitHub
Actions migration workflow is the controlled external release step. Never
add migrations to the Render Start Command. Code rollback does not
automatically reverse a Prisma migration, so prefer backward-compatible schema
changes (see below).

Recommended order:

```text
Development -> PR to main -> CI -> merge -> prisma migrate deploy (production)
  -> Render production deploy -> /health -> /ready -> smoke test
```

Supabase, not Render, owns PostgreSQL backup and recovery. The repository does
not verify the current Supabase plan, backup retention, point-in-time recovery,
or restore-test status, so those capabilities must be confirmed in the
Supabase dashboard before relying on them. The free portfolio environment
should not imply production-grade backup guarantees.

### Backward-Compatible Migrations

GitHub Actions migration and Render's Git auto-deploy are not atomically
ordered (see [Render Service](#render-service)), so schema changes should be
backward-compatible whenever practical:

1. Add the new column as nullable or with a default.
2. Deploy the backend version that is compatible with both old and new schema.
3. Backfill data if required.
4. Switch application code to rely on the new field.
5. Remove the old column/shape in a later, separate release.

Do not assume that rolling back application code also rolls back an applied
migration.

## Smoke Test

Use a dedicated test account and safe test data:

1. `GET /health` returns `200` with `{ "data": { "status": "ok" } }`.
2. `GET /ready` returns `200` when PostgreSQL is reachable and `503` when it is unavailable.
3. A protected endpoint without a bearer token returns `401`.
4. A valid Supabase token can read and safely write its own test data.
5. A second account cannot read or mutate the first account's records.
6. No response or log contains tokens, passwords, database credentials, SQL,
   stack traces, or a localhost public URL.

## Contract Compatibility

Keep `/api/v1` for backward-compatible changes. Additive fields or optional filters can remain within the current namespace; incompatible changes require an explicit migration strategy and coordinated frontend work. Before changing a frontend-consumed endpoint, inspect `../dwmc-web` when available and update its API modules, types, query behavior, tests, and docs.

## Release Review

Before merging a release-worthy change, review:

- `npm run validate` output.
- API and authentication documentation.
- Prisma migration safety and generated client state.
- Ownership and security behavior.
- Frontend compatibility in the sibling repository.
- A Changeset when the behavior or operational impact warrants a release note.

`deploy-production.yml` applies committed migrations automatically after CI
succeeds on `main`; see [Database Migrations](#database-migrations).
