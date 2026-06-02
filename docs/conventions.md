# Conventions

## Naming

| Thing                 | Convention                    | Example                     |
| --------------------- | ----------------------------- | --------------------------- |
| Files                 | `kebab-case`                  | `auth.middleware.ts`        |
| Classes               | `PascalCase`                  | `AppError`                  |
| Functions / variables | `camelCase`                   | `getOrCreateUserProfile`    |
| Types / interfaces    | `PascalCase`                  | `AuthUser`, `AppBindings`   |
| Zod schemas           | `camelCase` + `Schema` suffix | `authUserSchema`            |
| Route files           | `<module>.routes.ts`          | `auth.routes.ts`            |
| Service files         | `<module>.service.ts`         | `auth.service.ts`           |
| Repository files      | `<module>.repository.ts`      | `transaction.repository.ts` |

---

## Module structure

Every domain module lives in `src/modules/<name>/` and follows this layout:

```
modules/transactions/
  transaction.routes.ts      # Hono router — thin, delegates to service
  transaction.schema.ts      # Zod schemas for request/response shapes
  transaction.service.ts     # Business logic
  transaction.repository.ts  # Prisma queries (no HTTP / no business logic)
```

Routes stay thin — they validate input, call the service, and return a response.
Business rules belong in the service. Database queries belong in the repository.

---

## Zod schemas

- Define schemas in `*.schema.ts` files, not inline in routes or services.
- Name schemas with a `Schema` suffix: `createTransactionSchema`, `userProfileResponseSchema`.
- Use `.strict()` on object schemas when the exact shape matters.
- Export inferred types alongside schemas:

```typescript
export const createTransactionSchema = z.object({ … })
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
```

---

## Error handling

- Throw `AppError` from services and middleware — never from routes directly.
- Use the appropriate error code: `NOT_FOUND`, `VALIDATION_ERROR`, `UNAUTHORIZED`, etc.
- The central `handleError` in `src/shared/errors/error-handler.ts` catches everything
  and converts it to the standard error envelope.
- Never let Prisma or Supabase errors propagate to the client raw — catch them in the
  service and rethrow as `AppError`.

```typescript
// ✅ Correct
throw new AppError('NOT_FOUND', 'Transaction not found', 404)

// ❌ Wrong — raw Prisma error leaks internal details
throw prismaError
```

---

## API responses

Always use the helpers from `src/shared/http/api-response.ts`:

```typescript
return c.json(successResponse({ user, profile }))
return c.json(errorResponse('NOT_FOUND', 'Resource not found'), 404)
```

Never construct raw `{ data: … }` or `{ error: … }` objects in route handlers.

---

## User data scoping

**Every** database query for user-owned data must be filtered by `userProfileId`.
This is non-negotiable — it prevents users from reading or modifying each other's data.

```typescript
// ✅ Always scope to the authenticated user
prisma.transaction.findMany({
  where: { userProfileId: profile.id },
})

// ❌ Never query without a user filter on user-owned tables
prisma.transaction.findMany()
```

---

## Testing

- Test files live in `src/tests/`.
- Mock external dependencies (Prisma, Supabase) with `vi.mock()` — tests must not
  require a running database or real Supabase credentials.
- Test file naming mirrors the feature: `auth.test.ts`, `health.test.ts`.
- Use `vi.clearAllMocks()` in `beforeEach` to prevent test pollution.
- Test the HTTP layer (status codes, response shapes) rather than internal
  implementation details.
- For real integration tests that require a live Supabase token, document the
  procedure in a comment inside the test file and skip them in CI with `it.skip`.

---

## TypeScript

- Strict mode is enabled — no implicit `any`, no unchecked index access.
- Use `type` imports where possible (`import type { … }`).
- Avoid `as any` outside of test files.
- All environment access goes through `src/config/env.ts` — never read
  `process.env` directly in application code.
