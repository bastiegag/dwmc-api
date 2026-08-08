# Releasing

`dwmc-api` is versioned independently from `dwmc-web`. The package version, Git tags/GitHub Releases, and public API namespace `/api/v1` are separate concerns.

## Quality Gate

The backend validation script runs formatting checks, lint, typecheck, Vitest, and the TypeScript build:

```bash
npm run validate
```

The CI workflow runs the equivalent checks on pull requests and pushes to `main`. The release workflow also runs `npm ci` and `npm run validate` before Changesets automation.

## Changesets and GitHub Actions

Create a release note with:

```bash
npm run changeset
```

The release workflow on `main` creates or updates the backend Version PR. Its Changesets action is configured to create GitHub Releases and push tags. The backend is private and is not published to npm.

Use `npm run version` to consume changesets and update the package/changelog state. `npm run release` is the configured Changesets tag command; it is not an npm publication command.

## Database Migrations

Schema changes require an approved Prisma migration and regenerated client:

```bash
npm run db:migrate
npm run db:generate
```

The release workflows do not automatically apply production database migrations. Migration ordering, backups, deployment timing, and rollback strategy must be handled by the deployment process that owns the target database. Do not invent a hosting platform or claim migration automation that is not configured here.

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

No deployment target, error-reporting service, or production migration runner is currently documented because none is configured in this repository.
