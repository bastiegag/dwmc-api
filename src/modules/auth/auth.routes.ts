import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from './auth.middleware.js'
import { getOrCreateUserProfile } from './auth.service.js'
import { successResponse } from '../../shared/http/api-response.js'

const authRoutes = new Hono<AppBindings>()

/**
 * GET /api/v1/auth/me
 *
 * Returns the authenticated Supabase user and their local UserProfile.
 * Creates or updates the profile on every call so it stays in sync with
 * changes made via Supabase Auth (e.g. email changes).
 */
authRoutes.get('/me', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const profile = await getOrCreateUserProfile(authUser)

    return c.json(
        successResponse({
            user: authUser,
            // Keep the legacy auth response field while profile clients use preferredCurrency.
            profile: {
                ...profile,
                currency:
                    'preferredCurrency' in profile
                        ? profile.preferredCurrency
                        : (profile as { currency?: string }).currency,
            },
        }),
    )
})

export { authRoutes }
