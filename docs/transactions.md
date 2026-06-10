# Transactions API

Transactions represent financial movements scoped to a `UserProfile`.

Types: `INCOME`, `EXPENSE`, `TRANSFER`, `ADJUSTMENT`.

Behavior:

- All routes require authentication (Supabase JWT via `Authorization: Bearer ...`).
- Transactions are soft-deleted via `isArchived` and excluded by default.
- Transactions belong to a single `UserProfile` and may reference `Account` and `Category` records owned by the same user.

Endpoints:

GET /api/v1/transactions

- Query params: `type`, `accountId`, `categoryId`, `fromAccountId`, `toAccountId`, `month`, `startDate`, `endDate`, `search`, `includeArchived`, `page`, `pageSize`
- Returns: `{ data: Transaction[], meta: { page, pageSize, total, totalPages } }`

POST /api/v1/transactions

- Create transaction. Request body is validated per `type`.
- 201 on success with `{ data: Transaction }`.

GET /api/v1/transactions/:id

- Returns a single transaction if it belongs to the authenticated user.

PATCH /api/v1/transactions/:id

- Update transaction. Ownership validated. Fields normalized according to `type`.

DELETE /api/v1/transactions/:id

- Soft-delete (sets `isArchived = true`).

Amount rules:

- `INCOME`, `EXPENSE`, `TRANSFER` amounts must be > 0.
- `ADJUSTMENT` amount can be negative, zero, or positive.

Account balance:

- `currentBalance = startingBalance + income - expenses + adjustments + incomingTransfers - outgoingTransfers` (archived transactions excluded)
