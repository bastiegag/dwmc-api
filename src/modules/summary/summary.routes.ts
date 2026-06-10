import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { parseOrThrow } from '../../shared/validation/validate.js'
import { successResponse } from '../../shared/http/api-response.js'
import { getMonthlySummary } from './summary.service.js'
import { getMonthlySummaryQuerySchema } from './summary.schema.js'

const summaryRoutes = new Hono<AppBindings>()

summaryRoutes.get('/monthly', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const query = parseOrThrow(getMonthlySummaryQuerySchema, c.req.query())
    const res = await getMonthlySummary(authUser, query)
    return c.json(successResponse(res))
})

export { summaryRoutes }
