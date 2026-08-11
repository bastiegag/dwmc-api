# Monthly Summary

`GET /api/v1/summary/monthly` returns calculated activity for an authenticated user's month.

## Query

- `month=YYYY-MM` is optional and defaults to the current UTC month. The value must be a valid calendar month.
- `recentLimit` is optional, defaults to `5`, and is capped at `20`.

The month is converted to a UTC range with an inclusive first instant and exclusive first instant of the following month. Archived transactions and other users' records are excluded.

## Result

The response includes the requested month, period dates, totals, top expense categories, top income categories, account breakdown, and recent transactions. Decimal values are serialized as numbers and dates as ISO strings.

The account breakdown represents activity during the selected month, not current balances or historical end-of-month balances. It includes accounts referenced by that month's non-archived transactions, with income, expense, adjustment, incoming-transfer, outgoing-transfer, and activity net totals. Category breakdowns include only categorized transactions; uncategorized transactions remain included in overall totals and transaction count but do not appear in either category array.

Totals are calculated as follows:

- `INCOME` contributes to `incomeTotal`.
- `EXPENSE` contributes to `expenseTotal`.
- `ADJUSTMENT` contributes to `adjustmentTotal`.
- `TRANSFER` contributes to `transferTotal` and not income or expense.
- `netTotal` is income minus expense plus adjustment.

Category breakdowns include only categorized transactions. The route and summary service are authoritative for the complete response shape.

The current implementation fetches the selected month's transactions once and performs the
totals and breakdowns in the service using integer cents. If monthly transaction volume makes
that request materially slow or memory-heavy, benchmark a database-side aggregation design
before changing the response contract; keep recent transaction retrieval separate so the
`recentLimit` cap remains effective.
