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

Request schemas are defined beside each route in `src/modules/*/*.schema.ts`. The module docs describe the business rules and filters for each resource.

## Query and Pagination

Sections and categories use `cursor` and `limit` query parameters. The shared pagination schema defaults `limit` to `50` and bounds it from `1` to `100`.

Transactions use `page` and `pageSize`, plus optional type, account/category relation IDs, date/month, search, and archive filters. A `month=YYYY-MM` filter is converted to the UTC month range. `startDate` and `endDate` are also supported by the transaction schema.

Budgets accept `month`, `categoryId`, and `includeArchived`. Summary accepts `month` and `recentLimit`; recent results are capped at `20` and default to `5`.

## Dates, Money, and Archives

Dates serialize as ISO strings. Month values use `YYYY-MM` and are calculated with UTC start-of-month and next-month boundaries. Prisma Decimal values are serialized to JSON numbers. Resource delete operations set `isArchived`; archived records are excluded by default where list queries provide that behavior.

For frontend consumption patterns, see `dwmc-web/docs/api.md` in the sibling repository. Authentication responsibilities are documented in [domains/auth.md](domains/auth.md). When changing a contract, inspect that client before merging the backend change.
