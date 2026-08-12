# Profile Domain

`UserProfile` stores identity and profile-level information for one authenticated Supabase user. Application appearance preferences belong to the frontend Settings experience instead. The backend derives the authoritative identity from the verified JWT `sub` and stores it as `authUserId`; there is no foreign key to Supabase Auth tables and `authUserId` is unique.

`GET /api/v1/profile` lazily initializes and returns the current user's profile. `PATCH /api/v1/profile` updates only `firstName`, `lastName`, `displayName`, and `preferredCurrency`. Identity and system fields are never accepted from clients. Empty editable text values are represented as `null`.

Email remains owned by Supabase Auth and is read-only in the frontend. `preferredCurrency` is a presentation/default preference limited initially to CAD, USD, and EUR. Changing it does not convert stored amounts or mutate historical transactions, account balances, or budgets; current financial values retain their existing application-currency meaning.
