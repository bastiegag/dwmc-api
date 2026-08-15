import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { successResponse } from '../../shared/http/api-response.js'
import { validateBody } from '../../shared/validation/validate.js'
import { getProfile, updateProfile } from './profile.service.js'
import { updateProfileSchema } from './profile.schema.js'

const profileRoutes = new Hono<AppBindings>()

profileRoutes.get('/', authMiddleware, async (c) => {
    const profile = await getProfile(c.get('authUser'))
    return c.json(successResponse(profile))
})

profileRoutes.patch('/', authMiddleware, async (c) => {
    const input = await validateBody(c, updateProfileSchema)
    const profile = await updateProfile(c.get('authUser'), input)
    return c.json(successResponse(profile))
})

export { profileRoutes }
