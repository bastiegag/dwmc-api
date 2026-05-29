# Categories

The categories module is the first business feature in the API. It provides secure,
user-scoped category CRUD for future transaction classification.

## Auth requirements

All endpoints require `Authorization: ******` and use `authMiddleware`.

## User scoping rules

- Services resolve the authenticated user to a local `UserProfile`.
- Every category query is scoped by `userProfileId`.
- Category IDs are never trusted alone; ownership is always checked.

## Endpoints

- `GET /api/v1/categories`
- `POST /api/v1/categories`
- `GET /api/v1/categories/:id`
- `PATCH /api/v1/categories/:id`
- `DELETE /api/v1/categories/:id`

### List example

```http
GET /api/v1/categories?type=EXPENSE&includeArchived=false
Authorization: ******
```

### Create example

```http
POST /api/v1/categories
Authorization: ******
Content-Type: application/json

{
  "name": "Groceries",
  "type": "EXPENSE",
  "color": "#22c55e",
  "icon": "shopping-cart"
}
```

## Soft delete behavior

`DELETE /api/v1/categories/:id` is a soft delete: it sets `isArchived = true`.
Archived categories are excluded by default from list responses unless
`includeArchived=true` is provided.

## Why categories before transactions

Transactions will reference categories. Building categories first gives a stable,
owned, validated taxonomy before transaction CRUD is introduced.

## Future transaction relation

Future transaction models will hold a foreign key to `Category.id`, while category
ownership remains enforced through the category's `userProfileId` relation.
