# Database

## Provider and Ownership

The application uses local PostgreSQL through Prisma. `DATABASE_URL` is the
Prisma connection string for that local database. Supabase Auth is separate:
`UserProfile.authUserId` uniquely links a local profile to a Supabase Auth user.
Every business model is scoped to `UserProfile.id`.

## Models

The schema contains `UserProfile`, `Section`, `Category`, `Account`,
`Transaction`, and `Budget`. Relationships, indexes, constraints, archive
behavior, and Decimal fields are authoritative in `prisma/schema.prisma`.

## Local Setup

Docker Compose starts PostgreSQL with the development database `dwmc_api`, user
`postgres`, password `postgres`, and port `5432`. A matching example URL is:

```text
postgresql://postgres:postgres@localhost:5432/dwmc_api?schema=public
```

Do not put real credentials in committed files. You may use another local
PostgreSQL installation by changing `DATABASE_URL` in `.env`.

## Migration Workflow

Migration history is committed under `prisma/migrations`.

```bash
npm run db:generate
npm run db:migrate       # create/apply a local development migration
npm run db:studio
npm run db:reset         # destructive local reset
npm run db:seed
```

Edit the schema, run `npm run db:migrate`, regenerate the client when needed,
and commit the schema and migration together. CI validates code but does not
connect to a database or apply migrations remotely.
