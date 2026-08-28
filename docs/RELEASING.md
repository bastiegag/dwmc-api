# Development and Releases

This repository is a local-first V1. There is no staging or production deployment
pipeline, hosted application database, or automated remote migration workflow.

## Local Workflow

1. Start PostgreSQL with `docker compose up -d`.
2. Copy `.env.example` to `.env` and set `APP_ORIGIN`, `DATABASE_URL`, and the
   Supabase Auth values.
3. Run `npm run db:generate`.
4. Run `npm run db:migrate` for the committed schema.
5. Start the API with `npm run dev`.

Use `npm run db:studio` to inspect local data and `npm run db:reset` to recreate
the local database. `npm run db:seed` runs the development seed script.

## Quality Gate

GitHub Actions runs formatting, linting, typechecking, Vitest, and the TypeScript
build on pull requests and pushes to `main`. It does not require a live database,
Supabase account, deployment credentials, or production secrets.

## Database Changes

Prisma owns the local PostgreSQL schema. Edit `prisma/schema.prisma`, run
`npm run db:migrate` to create and apply a development migration, regenerate the
client with `npm run db:generate`, and commit both the schema change and migration.
Committed migrations are not applied automatically by CI.

## Releases

Versioning and release notes use the repository's normal changeset and Git
workflow. Production deployment and hosted PostgreSQL are future work and have
no configuration or instructions in this V1.
