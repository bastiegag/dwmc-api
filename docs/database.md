# Database

## Provider and Ownership

The application uses PostgreSQL through Prisma. `UserProfile` is the local identity record linked to a Supabase Auth user by unique `authUserId`. Every business model references `UserProfile.id`, and services/repositories scope access to that profile.

## Models

- **UserProfile**: local profile data, preferred currency, locale, and ownership relations. `authUserId` is unique and is the only link to the Supabase Auth identity.
- **Section**: user-owned grouping with a name, color, and archive flag.
- **Category**: user-owned child of a section with a name, icon, and archive flag.
- **Account**: user-owned account with type, Decimal starting balance/goal, color, icon, and archive flag.
- **Transaction**: typed movement with Decimal amount, date, optional account/category relations, transfer source/target relations, and archive flag.
- **Budget**: user-owned category budget with `YYYY-MM` month, Decimal amount, and archive flag.

## Constraints and Indexes

Sections are unique per user/name. Categories are unique per user/section/name. Accounts are unique per user/name. Budgets are unique per user/category/month. Foreign keys use cascading deletes from ownership and section/category relationships as defined in `prisma/schema.prisma`.

User, relation, date, type, and month fields have indexes where the current schema requires list, lookup, or calculation performance. The schema is authoritative for the exact index set.

## Archive Behavior

The application uses soft archive flags instead of ordinary hard deletes. List queries normally exclude archived records and can expose them only where the route schema supports `includeArchived`. Archiving a section also archives its child categories in the service layer.

## Financial Persistence

Account `currentBalance`, budget `spent`, `remaining`, `progress`, and summary totals are computed values, not stored columns. Account and budget amounts use Prisma Decimal in storage and are serialized as JSON numbers by services. Transaction type determines which relations and calculations apply; see [transactions](domains/transactions.md), [accounts](domains/accounts.md), and [budgets](domains/budgets.md).

## Migrations

Migration history lives under `prisma/migrations`. Use `npm run db:migrate` for development migrations and `npm run db:generate` after schema changes. Production migration execution is not automated by the release workflow; deployment operators must apply an approved migration using the environment's database process.

## Supabase Production Connection

The Prisma datasource remains `provider = "postgresql"` and reads
`DATABASE_URL` only from the environment. The repository's local example uses
the direct Docker PostgreSQL service; no production Supabase connection string
or connection mode is committed. Render must receive the selected Supabase
PostgreSQL URL for the target project. A Supabase direct connection or
Supavisor session-pooler connection is compatible with this Prisma setup; use
the mode tested for the target Supabase project and do not use a transaction
pooler URL for Prisma migrations. Keep any migration/direct URL handling in the
database release process rather than committing credentials here.

Supabase owns PostgreSQL backups and recovery. Render does not provide a backup
of application data, and this API does not write persistent state to Render's
filesystem.
