# Accounts

Accounts represent places where money is tracked. Supported types are `CHECKING`, `SAVINGS`, `CREDIT_CARD`, `CASH`, `INVESTMENT`, `LOAN`, and `OTHER`.

## Endpoints

- `GET /api/v1/accounts`: list accounts, optionally filtered by `type` and `includeArchived`.
- `POST /api/v1/accounts`: create an account.
- `GET /api/v1/accounts/:id`: get one owned account.
- `PATCH /api/v1/accounts/:id`: update an owned account.
- `DELETE /api/v1/accounts/:id`: archive an owned account.

All endpoints require authentication. Account names are unique per user. Delete is a soft archive operation.

## Balance

`currentBalance` is computed and returned as a number; it is not stored. For non-archived transactions owned by the user:

```text
startingBalance + income - expenses + adjustments + incoming transfers - outgoing transfers
```

Income, expense, and adjustment movements use `accountId`. Transfers use `fromAccountId` and `toAccountId`. See [API design](api.md) for response envelopes and the Prisma schema for storage types.
