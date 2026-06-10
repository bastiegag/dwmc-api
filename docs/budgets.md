Budgets

Budgets represent a monthly spending target for a specific category.

Overview

- Budgets are monthly and scoped to a single user (`UserProfile`).
- A category can have at most one budget per user per month.
- Budgets are soft deleted using `isArchived` and excluded by default.
- Spending is calculated from `EXPENSE` transactions only. `INCOME`, `TRANSFER`, and `ADJUSTMENT` do not count.

Month format

- Use `YYYY-MM` (e.g. `2026-06`). The backend calculates the month range using UTC start of month.

Endpoints

GET /api/v1/budgets

Query params:

- `month=YYYY-MM` (optional, defaults to current month)
- `categoryId` (optional)
- `includeArchived=true|false` (optional)

Returns a list of budgets for the authenticated user. Each budget includes calculated fields: `spent`, `remaining`, `progress`, `isOverBudget`, `transactionCount`.

POST /api/v1/budgets

Create a budget.

Body:

{ "categoryId": "...", "month": "2026-06", "amount": 600 }

Validation:

- `categoryId` must belong to the authenticated user.
- `month` must be `YYYY-MM`.
- `amount` must be >= 0.
- Duplicate budgets for the same category and month are rejected (409).

GET /api/v1/budgets/:id

Returns a single budget for the authenticated user, including calculated fields.

PATCH /api/v1/budgets/:id

Update a budget. Validates ownership and prevents duplicates when changing `categoryId` or `month`.

DELETE /api/v1/budgets/:id

Soft-deletes a budget by setting `isArchived=true`.

How spent is calculated

- Only `EXPENSE` transactions are counted.
- Transactions must be in the same `categoryId` and within the month date range: `date >= startOfMonth && date < startOfNextMonth`.
- Archived transactions and transactions belonging to other users are excluded.

Notes for frontend

- Use the returned `spent`, `remaining`, `progress`, and `isOverBudget` fields directly.
- `progress` may exceed 100 when the user is over budget. When `amount` is `0` and there is spending, the backend returns `progress = 100` to indicate full/over budget.
