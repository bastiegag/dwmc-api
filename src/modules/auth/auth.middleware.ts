import type { MiddlewareHandler } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { supabase } from '../../lib/supabase.js'
import { AppError } from '../../shared/errors/AppError.js'

/**
 * authMiddleware validates the Supabase access token sent by the frontend in the
 * Authorization header and adds the authenticated user to the Hono context.
 *
 * Use this middleware on any route that requires authentication:
 *
 *   router.get('/protected', authMiddleware, handler)
 *
 * The authenticated user is then available as:
 *
 *   const authUser = c.get('authUser')
 */
export const authMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing or invalid Authorization header', 401)
  }

  const token = authHeader.slice(7) // strip "Bearer "

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401)
  }

  c.set('authUser', {
    id: user.id,
    email: user.email ?? undefined,
  })

  await next()
}
