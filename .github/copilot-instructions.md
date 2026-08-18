# Copilot Instructions for `dwmc-api`

## Project Overview

`dwmc-api` is the Hono/TypeScript backend for Dude, Where's My Cash?. It owns persistence, authorization, validation, financial calculations, and the `/api/v1` contract. The sibling `../dwmc-web` repository consumes this API; cross-repository changes must be coordinated.

## Documentation Hierarchy

Consult documentation in this order before making design decisions:

1. [Developer Playbook](../../dwmc-web/docs/dev-playbook.md) for shared development principles and feature workflow.
2. [Engineering Audit Playbook](../../dwmc-web/docs/engineering-audit-playbook.md) for review scope, severity, and closure criteria.
3. [Backend Architecture](../docs/architecture.md) and [frontend architecture](../../dwmc-web/docs/architecture.md) for responsibilities and boundaries.
4. [API design](../docs/api.md), [database](../docs/database.md), [authentication](../docs/domains/auth.md), and the relevant [domain document](../docs/domains/) for contracts and business rules.
5. ADRs, when present, for decisions that constrain the implementation.
6. The relevant [README](../README.md) and package scripts for setup, commands, and repository orientation.

Also consult [backend testing](../docs/testing.md), [frontend testing](../../dwmc-web/docs/testing.md), and [releasing](../docs/releasing.md) or [frontend releasing](../../dwmc-web/docs/releasing.md) when the change affects those areas. The roadmap is context, not a specification: do not implement planned work without confirmed scope.

## Database Migration Safety

- Never run `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` against production; these are development-only commands.
- Always commit the Prisma migration together with the matching `schema.prisma` change.
- GitHub Actions only applies committed migrations to production using `prisma migrate deploy`; it never generates migrations.
- Production uses a protected `DATABASE_URL` secret in the GitHub `production` Environment; never hardcode or print credentials.
- A failed migration must stop release progression; never resolve, reset, or retry destructively to work around it.

## Development Expectations

- Inspect the nearest existing module, route, service, repository, schema, and tests before adding a pattern.
- Follow the documented architecture and module boundaries; prefer consistency over cleverness.
- Keep routes thin, schemas responsible for input validation, services responsible for business rules and serialization, repositories responsible for Prisma access, and shared code genuinely cross-cutting.
- Keep frontend and backend changes aligned. Verify request/response shapes, authentication, ownership, dates, money, and downstream effects in both repositories.
- Avoid unrelated refactors, duplicate business logic, unnecessary abstractions, and breaking API changes.

## Documentation Expectations

Update the relevant documentation in the same task whenever code changes affect architecture, API contracts, business rules, database behavior, engineering workflow, developer conventions, testing, release behavior, or roadmap status. Link to the canonical document instead of duplicating its content. Never leave documentation describing behavior that the implementation no longer provides.

## Engineering Expectations

Preserve backend ownership and authorization boundaries. Keep financial calculations authoritative in services, persistence isolated in repositories, and public response behavior consistent with the API documentation and tests. Prefer small, comprehensible changes that fit the codebase over speculative generalization.

## Code Generation Rules

- Read existing code, schemas, tests, and relevant documentation first.
- Match local naming, module layout, formatting, and error/response conventions.
- Modify existing code when appropriate instead of rewriting working paths.
- Minimize breaking changes; use an explicit migration strategy for incompatible contracts.
- Add meaningful regression coverage at the HTTP boundary where practical.
- For schema changes, create the required Prisma migration, regenerate the client, and document migration implications.

## Feature Development

For a new feature, consult the Developer Playbook, relevant backend and frontend architecture, the API/database/auth/domain documentation, and the testing guidance. Implement backend and frontend contract changes together when needed, then update tests and affected documentation. Verify ownership isolation, validation, archive behavior, month boundaries, money calculations, and response envelopes.

## Engineering Audits

Before considering a feature complete, follow the Engineering Audit Playbook. Evaluate implementation against documented standards, inspect integration and cross-feature effects, report evidence-based findings using its severity levels, and conclude with `READY TO CLOSE` or `NOT READY TO CLOSE` as defined there.

## General Rules

Copilot must not invent undocumented requirements, duplicate project documentation, introduce architectural patterns without justification, ignore existing conventions, weaken authorization, expose secrets, or leave implementation and documentation inconsistent. When documentation and assumptions conflict, inspect the code and tests, identify the discrepancy, and update the appropriate source and documentation together.
