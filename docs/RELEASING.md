# Releasing

`dwmc-api` is versioned independently from `dwmc-web`. The package version, Git tags/GitHub Releases, and public API namespace `/api/v1` are separate concerns.

## Quality Gate

The backend validation script runs formatting checks, lint, typecheck, Vitest, and the TypeScript build:

```bash
npm run validate
```

The CI workflow runs the equivalent checks on pull requests and pushes to
`main`. There is currently no release or migration workflow in this repository.

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
Build Command: npm ci && npm run db:generate && npm run build
Start Command: npm start
Health Check Path: /health
```

`npm start` runs the compiled `dist/server.js`. The server uses Render's
`PORT`, falls back to `3000` locally, binds to `0.0.0.0`, and logs only the
environment and bound port. Render Git auto-deploy from `main` is the intended
simple deployment trigger; GitHub Actions remains the quality and controlled
migration workflow rather than a competing deploy trigger.

Render Free may spin the service down after inactivity, so cold starts are
expected. The service does not require a persistent disk.

## Environment Variables

Set these values in Render. Never commit or print their values:

| Variable                    | Required | Secret | Source   | Notes                                                                                           |
| --------------------------- | -------- | ------ | -------- | ----------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | Yes      | No     | Render   | Set to `production`.                                                                            |
| `DATABASE_URL`              | Yes      | Yes    | Supabase | PostgreSQL URL for the target Supabase project.                                                 |
| `SUPABASE_URL`              | Yes      | No     | Supabase | Project URL used by backend Auth validation.                                                    |
| `SUPABASE_ANON_KEY`         | Yes      | No     | Supabase | Publishable/anon key required by the current env contract; not used for server-side validation. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Yes    | Supabase | Backend-only key used by `supabase.auth.getUser`; never expose to Vercel/browser code.          |
| `APP_ORIGIN`                | Yes      | No     | Vercel   | Exact frontend origin, such as `https://app.example.com`; no trailing path.                     |
| `PORT`                      | No       | No     | Render   | Render supplies this automatically. Do not configure it manually.                               |

Use separate Supabase projects and separate Render environment values for
staging and production. Do not reuse production credentials in staging.

## CORS

`APP_ORIGIN` controls the single allowed browser origin. The API explicitly
allows `Authorization` and `Content-Type`, and supports the resource methods
used by the frontend plus OPTIONS preflight. Local development keeps its
localhost origin in `.env`; production must use the Vercel production origin.

Preview Vercel origins are not automatically allowed. If preview access is
needed, introduce an explicit allowlist or deliberate origin matcher; do not
switch production CORS to a wildcard.

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

Schema changes require an approved Prisma migration and regenerated client. Create
development migrations locally, but apply the committed migration history to a
production database with `prisma migrate deploy`:

```bash
npm run db:migrate
npm run db:generate
npm run db:migrate:deploy
```

The release workflows do not automatically apply production database migrations. Run
`npm run db:migrate:deploy` only against the intended production `DATABASE_URL`, after
confirming a current backup and reviewing the SQL. Migration ordering, deployment
timing, and rollback strategy must be handled by the deployment process that owns the
target database. Do not use `db:reset`, `prisma migrate reset`, or `prisma migrate dev`
against production.

Render Free does not provide a normal one-off migration job, so use a controlled
external release step such as a protected GitHub Actions workflow or an operator
machine with `DATABASE_URL` supplied as a secret. The repository currently has
no migration automation workflow; do not claim this is automated. Never add
migrations to the Render Start Command. Code rollback does not automatically
reverse a Prisma migration, so prefer backward-compatible schema changes.

Recommended order:

```text
Development -> CI -> review migration -> prisma migrate deploy -> Render
deployment -> /health -> /ready -> authenticated API smoke test -> frontend
verification when its contract changed
```

Supabase, not Render, owns PostgreSQL backup and recovery. The free portfolio
environment should not imply production-grade backup guarantees.

## Smoke Test

Use a staging or dedicated test account and safe test data:

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

No automated production migration runner is configured in this repository.
