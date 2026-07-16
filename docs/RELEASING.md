# Releasing

This repository uses independent backend versioning. The backend package version in `package.json` is not tied to the frontend repository version.

The release workflow in `.github/workflows/release.yml` runs `npm run validate` on pushes to `main`, then uses Changesets to version the backend and create or update the release PR.

## Versioning model

There are three different version concepts:

- Backend package version: stored in `package.json` and updated by Changesets.
- Git tags and GitHub Releases: created from the versioned backend release process, such as `v0.5.2`.
- API contract version: the public HTTP namespace under `/api/v1`.

These are intentionally separate. A backend patch or minor release does not automatically change the API contract version.

## SemVer policy

This project follows Semantic Versioning for the backend package:

- Patch: bug fixes, validation fixes, logging improvements, internal refactors, and backward-compatible migration work.
- Minor: backward-compatible features, new endpoints, optional fields, new filters, or additive database work.
- Major: intentionally incompatible backend or API behavior.

Because the backend is still below `1.0.0`, the team can treat carefully managed breaking changes as minor releases if that better matches the current contract strategy. Once the backend reaches `1.0.0`, breaking changes should be treated as major releases.

## Changesets

Changesets are used to collect release notes and drive version bumps.

Use:

```bash
npm run changeset
```

Choose patch, minor, or major based on the behavior change, then write a user-facing note. Changesets are generally not required for documentation-only updates, CI-only changes, or internal refactoring with no release impact.

Versioning is handled with:

```bash
npm run version
```

This updates `package.json`, consumes changesets, and generates `CHANGELOG.md`.

## Local tags

After a versioned release is ready, use:

```bash
npm run release
```

This is meant for local tag creation only. It must not publish to npm.

## Changelog

Changesets writes user-facing release notes into `CHANGELOG.md`. The changelog should reflect backend behavior changes only and should not copy frontend release notes.

## Conventional Commits

Commit messages are validated with Commitlint and Husky.

Examples that should pass:

- `feat(auth): add refresh token rotation`
- `fix(budgets): recalculate totals after transaction creation`
- `chore(deps): update backend dependencies`
- `ci(release): add automated GitHub releases`

If you need to describe a security fix, `fix(auth): reject expired sessions` is the default preferred form.

## GitHub Actions

The release workflow runs on pushes to `main`, installs dependencies with `npm ci`, runs the backend validation suite, and then lets Changesets create or update the Version PR.

Repository permissions required for the release workflow:

- `contents: write`
- `pull-requests: write`

## Database migrations

Migrations are not automatically executed as part of release creation.

Use these categories when reviewing a release note:

- Backward-compatible additive migration
- Destructive migration
- Data migration
- Rollback-safe migration
- Deployment-order-sensitive migration

Prefer expand-and-contract when a change must stay compatible with existing clients.

## Frontend and backend compatibility

The frontend and backend versions remain independent.

Compatibility is documented only when a change requires coordination. A backend patch or minor release should not force a frontend release unless the API contract changes.

## Hotfixes

A hotfix should branch from a production-compatible state, include a regression test, add a patch changeset, pass validation, and then go through the normal Version PR and release process.

## Breaking changes

Do not introduce `/api/v2` just because the backend package version changes. Only add a new API version when backward compatibility cannot be maintained through additive changes or deprecation.

## Release recovery

If a release fails after the Version PR is merged, fix the underlying issue, update the changeset or version commit if needed, and re-run the normal release process. Do not manually rewrite published history unless recovery requires it.

## GitHub configuration

The repository needs the default `GITHUB_TOKEN` available to Actions. No npm publishing token is required because this backend is not published to npm.
