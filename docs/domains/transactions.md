# Transactions

Transactions are user-owned financial movements with type `INCOME`, `EXPENSE`, `TRANSFER`, or `ADJUSTMENT`.

## Endpoints

- `GET /api/v1/transactions`: offset-paginated list.
- `POST /api/v1/transactions`: create.
- `GET /api/v1/transactions/:id`: get one owned transaction.
- `PATCH /api/v1/transactions/:id`: update and normalize type-specific relations.
- `DELETE /api/v1/transactions/:id`: archive.

All endpoints require authentication. List filters include type, account relation IDs, category ID, month, start/end dates, search, archive inclusion, page, and page size. Month filtering uses `YYYY-MM` and the UTC month range.

## Type Rules

- Income and expense use one `accountId` and may use a category.
- Transfers use `fromAccountId` and `toAccountId`, require different accounts, and do not use `accountId` or `categoryId`.
- Adjustments use one `accountId` and do not use a category.
- Income, expense, and transfer amounts must be greater than zero.
- Adjustment amounts may be negative, zero, or positive.
- Referenced accounts and categories must belong to the authenticated user.

Transactions are archived with `isArchived: true` and excluded from default lists and calculations. Amounts are serialized from Prisma Decimal to numbers and dates to ISO strings.

The frontend client patterns are documented in `dwmc-web/docs/api.md` in the sibling repository.
