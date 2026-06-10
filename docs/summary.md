# Monthly Summary

GET /api/v1/summary/monthly

Query params:

- `month` (optional) — YYYY-MM. Defaults to the current month when omitted.
- `recentLimit` (optional) — integer, default 5, max 20.

Requires Authorization: `Bearer <token>`

Response shape (success):

```
{ data: { month, period: { startDate, endDate }, totals: { incomeTotal, expenseTotal, adjustmentTotal, transferTotal, netTotal, transactionCount }, topExpenseCategories: [], topIncomeCategories: [], accountBreakdown: [], recentTransactions: [] } }
```

Business rules:

- Only transactions belonging to the authenticated user are included.
- Archived transactions are excluded.
- INCOME contributes to `incomeTotal`; EXPENSE to `expenseTotal`; ADJUSTMENT to `adjustmentTotal`.
- TRANSFER is tracked in `transferTotal` and does not count as income or expense.
- `netTotal = incomeTotal - expenseTotal + adjustmentTotal`.
- Category breakdowns include only transactions that have a category set.
- Category `percentage` is calculated as `categoryTotal / (incomeTotal|expenseTotal) * 100` and guarded against division by zero.
