import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { successResponse } from '../../shared/http/api-response.js'
import { parseOrThrow, validateBody } from '../../shared/validation/validate.js'
import {
    createBudgetSchema,
    getBudgetsQuerySchema,
    budgetParamsSchema,
    updateBudgetSchema,
} from './budget.schema.js'
import {
    listBudgets,
    createBudget,
    getBudgetById,
    updateBudget,
    archiveBudget,
} from './budget.service.js'

const budgetRoutes = new Hono<AppBindings>()

budgetRoutes.get('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const query = parseOrThrow(getBudgetsQuerySchema, c.req.query())
    const items = await listBudgets(authUser, query)
    return c.json(successResponse(items))
})

budgetRoutes.post('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const input = await validateBody(c, createBudgetSchema)
    const b = await createBudget(authUser, input)
    return c.json(successResponse(b), 201)
})

budgetRoutes.get('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(budgetParamsSchema, c.req.param())
    const b = await getBudgetById(authUser, params.id)
    return c.json(successResponse(b))
})

budgetRoutes.patch('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(budgetParamsSchema, c.req.param())
    const input = await validateBody(c, updateBudgetSchema)
    const b = await updateBudget(authUser, params.id, input)
    return c.json(successResponse(b))
})

budgetRoutes.delete('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(budgetParamsSchema, c.req.param())
    const b = await archiveBudget(authUser, params.id)
    return c.json(successResponse(b))
})

export { budgetRoutes }
