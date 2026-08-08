# Budgets

A budget is a monthly spending target for one category. The unique key is user, category, and `month`.

## Endpoints

- `GET /api/v1/budgets`: list by `month` (defaults to the current UTC month), optionally `categoryId` and `includeArchived`.
- `POST /api/v1/budgets`: create with `categoryId`, `month`, and `amount`.
- `GET /api/v1/budgets/:id`: get one budget.
- `PATCH /api/v1/budgets/:id`: update category, month, or amount while preserving uniqueness.
- `DELETE /api/v1/budgets/:id`: archive the budget.

All endpoints require authentication. The category must belong to the current user, the month must be `YYYY-MM`, and amount validation is enforced by the budget schema. Duplicate category/month budgets return conflict responses.

## Spending Calculation

The service aggregates only non-archived `EXPENSE` transactions for the same user and category in the UTC range `date >= first day of month` and `date < first day of next month`. Income, transfers, and adjustments do not count.

Responses include computed `spent`, `remaining`, `progress`, `isOverBudget`, and `transactionCount`. Use those backend values in the frontend rather than duplicating the calculation.
