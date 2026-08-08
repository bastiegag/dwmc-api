# Monthly Summary

`GET /api/v1/summary/monthly` returns calculated activity for an authenticated user's month.

## Query

- `month=YYYY-MM` is optional and defaults to the current UTC month.
- `recentLimit` is optional, defaults to `5`, and is capped at `20`.

The month is converted to a UTC range with an inclusive first instant and exclusive first instant of the following month. Archived transactions and other users' records are excluded.

## Result

The response includes the requested month, period dates, totals, top expense categories, top income categories, account breakdown, and recent transactions. Decimal values are serialized as numbers and dates as ISO strings.

Totals are calculated as follows:

- `INCOME` contributes to `incomeTotal`.
- `EXPENSE` contributes to `expenseTotal`.
- `ADJUSTMENT` contributes to `adjustmentTotal`.
- `TRANSFER` contributes to `transferTotal` and not income or expense.
- `netTotal` is income minus expense plus adjustment.

Category breakdowns include only categorized transactions. The route and summary service are authoritative for the complete response shape.
