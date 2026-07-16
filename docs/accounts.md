# Accounts

## Overview

An Account represents a place where money exists or is tracked. Examples include checking
accounts, savings accounts, credit cards, cash, investment accounts, and loans.

Accounts are the foundation for Transactions. Every transaction is recorded against an
account, and the account balance reflects the sum of all its transactions.

---

## Account types

| Type          | Description                                   |
| ------------- | --------------------------------------------- |
| `CHECKING`    | Day-to-day bank account                       |
| `SAVINGS`     | Savings account                               |
| `CREDIT_CARD` | Credit card (may have a negative balance)     |
| `CASH`        | Physical cash                                 |
| `INVESTMENT`  | Investment or brokerage account               |
| `LOAN`        | Loan or mortgage (typically negative balance) |
| `OTHER`       | Any account that does not fit the above       |

---

## Balance strategy

`currentBalance` is a computed API field returned in every account response. It is never
stored in the database.

The backend calculates it from the account’s starting balance plus all in-app transaction
activity owned by the same user, excluding archived transactions.

```
currentBalance = startingBalance + income - expenses + adjustments + incomingTransfers - outgoingTransfers
```

Transactions of type `ADJUSTMENT` can be positive, negative, or zero and are used to
reconcile the real account balance with the app’s calculated balance.

**Why not store `currentBalance` in the database?**

Materialising the balance as a column creates consistency problems — it must be kept in
sync with every transaction mutation. Computing it on the fly from the source data is
more reliable. If performance becomes a concern, a materialized view or cache layer can
be added later without changing the API contract.

---

## User scoping and security

- Every account has a `userProfileId` that links it to the authenticated user.
- All repository queries **must** include `where: { userProfileId }`.
- The service layer resolves the `UserProfile` from the Supabase `authUserId` before
  calling the repository. This means the Supabase token is the only trust boundary.
- An authenticated user can never read, modify, or archive another user's accounts.
  Any operation on an account that does not belong to the requesting user returns `404`.

---

## Soft delete

Accounts are never hard-deleted. `DELETE /api/v1/accounts/:id` sets `isArchived = true`.

Archived accounts are excluded from list responses by default. Pass `includeArchived=true`
to include them.

---

## Field reference

| Field             | Type                | Notes                                              |
| ----------------- | ------------------- | -------------------------------------------------- |
| `id`              | `string` (CUID)     | Auto-generated                                     |
| `name`            | `string`            | Trimmed, 1–80 chars, unique per user               |
| `type`            | `AccountType`       | Default: `CHECKING`                                |
| `startingBalance` | `number`            | Can be negative (credit cards, loans). Default `0` |
| `currentBalance`  | `number` (computed) | Not stored; computed from transactions             |
| `goal`            | `number \| null`    | Optional savings target                            |
| `color`           | `string`            | Trimmed, 1–40 chars                                |
| `icon`            | `string`            | Trimmed, 1–80 chars                                |
| `isArchived`      | `boolean`           | Default `false`                                    |
| `createdAt`       | `string` (ISO 8601) | Auto-set on create                                 |
| `updatedAt`       | `string` (ISO 8601) | Auto-updated on every write                        |

---

## Endpoints

### GET /api/v1/accounts

Returns all accounts for the authenticated user ordered by name.

**Query params**

| Param             | Type    | Default | Description               |
| ----------------- | ------- | ------- | ------------------------- |
| `includeArchived` | boolean | `false` | Include archived accounts |
| `type`            | string  | —       | Filter by account type    |

### POST /api/v1/accounts

Creates a new account for the authenticated user. Returns `201`.

### GET /api/v1/accounts/:id

Returns one account. Returns `404` if the account does not exist or belongs to another user.

### PATCH /api/v1/accounts/:id

Partially updates an account. All body fields are optional.

### DELETE /api/v1/accounts/:id

Soft-deletes the account (`isArchived = true`). Returns the archived account.

---

## Example responses

**Single account**

```json
{
    "data": {
        "id": "clxyz123",
        "name": "Checking Account",
        "type": "CHECKING",
        "startingBalance": 1250.75,
        "currentBalance": 1250.75,
        "goal": null,
        "color": "#3b82f6",
        "icon": "wallet",
        "isArchived": false,
        "createdAt": "2026-06-07T10:00:00.000Z",
        "updatedAt": "2026-06-07T10:00:00.000Z"
    }
}
```

**Credit card with negative balance**

```json
{
    "data": {
        "id": "clxyz456",
        "name": "Visa",
        "type": "CREDIT_CARD",
        "startingBalance": -850.0,
        "currentBalance": -850.0,
        "goal": 0,
        "color": "#ef4444",
        "icon": "credit-card",
        "isArchived": false,
        "createdAt": "2026-06-07T10:00:00.000Z",
        "updatedAt": "2026-06-07T10:00:00.000Z"
    }
}
```
