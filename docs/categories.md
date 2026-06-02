# Sections and Categories

## Two-level classification model

The budgeting domain uses a strict two-level hierarchy:

- **Section**: a top-level grouping (for example `Food`, `Home`, `Income`)
- **Category**: a child item inside a section (for example `Groceries`, `Rent`, `Salary`)

Each section and category is user-scoped: records are always filtered by the authenticated user's `UserProfile.id`.

## Why there is no `type` field

Sections and categories intentionally do **not** store transaction type (`income`, `expense`, `transfer`, `adjustment`).

Type classification is planned for the **Transaction** model. This keeps category management simple and avoids coupling category labels to transaction logic too early.

## Future transaction relationship

Future `Transaction` records will reference a `Category` (and therefore indirectly its parent `Section`) to classify spending and income.

## Soft delete behavior

- Sections and categories are soft-deleted with `isArchived = true`.
- Archived records are excluded from list endpoints by default.
- Archiving a section also archives all categories under that section.

## Example data

```json
{
    "section": {
        "id": "sec_food",
        "name": "Food",
        "color": "#22c55e",
        "categories": [
            { "id": "cat_groceries", "name": "Groceries", "icon": "shopping-cart" },
            { "id": "cat_restaurants", "name": "Restaurants", "icon": "utensils" }
        ]
    }
}
```
