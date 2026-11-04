# Development and Releases

This repository is a local-first V1. There is no staging or production deployment
pipeline, hosted application database, or automated remote migration workflow.

Local setup and daily development commands are documented in
[Development](development.md). Testing and CI commands are documented in
[Testing](testing.md).

## Quality gate

GitHub Actions runs formatting, linting, typechecking, Vitest, the TypeScript
build, and a separate PostgreSQL integration job on pull requests and pushes to
`main`. It does not require a live database, Supabase account, deployment
credentials, or production secrets.

## Database Changes

Prisma owns the local PostgreSQL schema. Edit `prisma/schema.prisma`, run
`npm run db:migrate` to create and apply a development migration, regenerate the
client with `npm run db:generate`, and commit both the schema change and migration.
Committed migrations are not applied automatically by CI.
