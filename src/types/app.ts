export type AuthUser = {
  id: string
  email?: string
}

/**
 * AppBindings types the Hono context variables so `c.get('authUser')` is
 * properly typed across the entire application, including middleware and routes.
 */
export type AppBindings = {
  Variables: {
    authUser: AuthUser
  }
}
