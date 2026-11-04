# API Design

## Base and Authentication

The API is served from the backend origin. Resource routes use `/api/v1`. `GET /health` and `GET /ready` are public. All other current routes require a Supabase access token in `Authorization: Bearer <token>`.

## Response Envelopes

Ordinary success:

```json
{ "data": {} }
```

Cursor pagination:

```json
{ "data": [], "nextCursor": null }
```

Offset pagination:

```json
{ "data": [], "meta": { "page": 1, "pageSize": 25, "total": 0, "totalPages": 0 } }
```

Errors:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "issues": {} } }
```

`issues` is optional. Current error codes map to `401` unauthorized, `403` forbidden, `404` not found, `422` validation error, `409` conflict, and `500` internal error. Some explicit domain validation checks use `400`; the route/service source and tests are authoritative for individual cases.

Requests are limited to 1 MiB at the application boundary and receive standard
security response headers. The API emits an `X-Request-ID` response header and
includes the same request ID in structured request logs.

## Endpoint Inventory

| Method           | Path                       | Access        | Result                                        |
| ---------------- | -------------------------- | ------------- | --------------------------------------------- |
| GET              | `/health`                  | Public        | `{ data: { status: "ok" } }`.                 |
| GET              | `/ready`                   | Public        | Database readiness or `503`.                  |
| GET              | `/api/v1/auth/me`          | Authenticated | Supabase user and synchronized `UserProfile`. |
| GET/POST         | `/api/v1/sections`         | Authenticated | Cursor-paginated list or create.              |
| GET/PATCH/DELETE | `/api/v1/sections/:id`     | Authenticated | Read, update, or archive a section.           |
| GET/POST         | `/api/v1/categories`       | Authenticated | Cursor-paginated list or create.              |
| GET/PATCH/DELETE | `/api/v1/categories/:id`   | Authenticated | Read, update, or archive a category.          |
| GET/POST         | `/api/v1/accounts`         | Authenticated | Account list or create.                       |
| GET/PATCH/DELETE | `/api/v1/accounts/:id`     | Authenticated | Read, update, or archive an account.          |
| GET/POST         | `/api/v1/transactions`     | Authenticated | Offset-paginated list or create.              |
| GET/PATCH/DELETE | `/api/v1/transactions/:id` | Authenticated | Read, update, or archive a transaction.       |
| GET              | `/api/v1/summary/monthly`  | Authenticated | Monthly summary and recent transactions.      |
| GET/POST         | `/api/v1/budgets`          | Authenticated | Monthly budget list or create.                |
| GET/PATCH/DELETE | `/api/v1/budgets/:id`      | Authenticated | Read, update, or archive a budget.            |
| GET/PATCH        | `/api/v1/profile`          | Authenticated | Current user's profile; GET initializes it.   |

Request schemas are defined beside each route in `src/modules/*/*.schema.ts`.
Business rules and resource filters are summarized in this document; the route,
schema, service, and integration tests remain authoritative for implementation
details.

## Query and Pagination

Sections and categories use `cursor` and `limit` query parameters. The shared pagination schema defaults `limit` to `50` and bounds it from `1` to `100`.

Transactions use `page` and `pageSize`, plus optional type, account/category relation IDs, date/month, search, and archive filters. A `month=YYYY-MM` filter is converted to the UTC month range. `startDate` and `endDate` are also supported by the transaction schema.

Budgets accept `month`, `categoryId`, and `includeArchived`. Summary accepts `month` and `recentLimit`; recent results are capped at `20` and default to `5`.

## Dates, Money, and Archives

Dates serialize as ISO strings. Month values use `YYYY-MM` and are calculated with UTC start-of-month and next-month boundaries. Prisma Decimal values are serialized to JSON numbers. Resource delete operations set `isArchived`; archived records are excluded by default where list queries provide that behavior.

For frontend consumption patterns, see `dwmc-web/docs/api.md` in the sibling
repository. Authentication and authorization responsibilities are documented in
[Architecture](architecture.md). When changing a contract, inspect that client
before merging the backend change.

## Financial and authorization boundaries

The API is authoritative for monetary validation and calculations. Monetary
inputs are finite, limited to PostgreSQL `Decimal(12,2)`, and restricted to
two decimal places before persistence. Account balances and summaries use
integer-cent arithmetic, and archived transactions are excluded from active
balances, summaries, and budget expense totals.

Authenticated resource queries are scoped by the local `UserProfile.id`
resolved from the verified Supabase user. Services validate ownership of every
referenced account, category, and section before creating or updating a
resource; clients cannot introduce cross-user references through payloads.

## Domain rules

Accounts support `CHECKING`, `SAVINGS`, `CREDIT_CARD`, `CASH`, `INVESTMENT`,
`LOAN`, and `OTHER`. Account names are unique per user. `startingBalance` is a
baseline included once in the calculated balance; it does not create a
transaction. `goal` is optional, positive, and valid only for savings
accounts.

Transactions use one of `INCOME`, `EXPENSE`, `TRANSFER`, or `ADJUSTMENT`.
Income and expense use one account and may use a category. Transfers use
different `fromAccountId` and `toAccountId` values and do not use a category.
Adjustments may be negative, zero, or positive and do not use a category.
Income, expense, and transfer amounts must be positive. Archived transactions
are excluded from default lists, balances, summaries, and budget totals.

Sections and categories form a user-owned two-level hierarchy. A category's
section must belong to the same user. Archived sections cannot receive new
categories; archiving a section archives its child categories atomically.

Budgets are monthly category targets. The category must belong to the current
user, the month must be a valid `YYYY-MM` calendar month, and archived
categories cannot receive new budgets. Spending counts only non-archived
expense transactions for the same user and category in the UTC month range.

The monthly summary uses an inclusive UTC month start and exclusive next-month
boundary. Its account breakdown represents activity during that month, not
current or historical end-of-month balances.

Profile updates accept only `firstName`, `lastName`, `displayName`, and
`preferredCurrency`; editable empty text is represented as `null`, and
supported currencies are CAD, USD, and EUR. Email and identity fields remain
read-only because they belong to Supabase Auth.

Summary responses include the selected period, totals, top income and expense
categories, account activity, and recent transactions. Uncategorized
transactions remain in overall totals and counts but do not appear in category
breakdowns.
