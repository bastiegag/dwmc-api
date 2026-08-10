# Sections and Categories

The product uses a two-level hierarchy:

- A **Section** has a name and color.
- A **Category** belongs to one Section and has a name and icon.

Neither model defines transaction direction. Transaction type is owned by the transaction record.

## Endpoints

Both resources support authenticated list, create, get, patch, and delete/archive operations:

Section and category lists use cursor pagination with `cursor`, `limit`, and `nextCursor`. Categories can be filtered by `sectionId`. Sections can include categories with `includeCategories`; archived records are excluded by default and can be included where supported.

Section archive and child Category archive are persisted atomically. Archived Sections cannot receive new Categories or become Category movement targets; archived records remain available through supported archived queries for historical references.

Names are unique within the relevant user scope. A category's section must belong to the same user. Archiving a section archives its child categories. See [API design](../api.md) for the shared response contract.
