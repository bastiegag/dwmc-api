import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { successResponse } from '../../shared/http/api-response.js'
import { parseOrThrow, validateBody } from '../../shared/validation/validate.js'
import {
    accountParamsSchema,
    createAccountSchema,
    getAccountsQuerySchema,
    updateAccountSchema,
} from './account.schema.js'
import {
    archiveAccount,
    createAccount,
    getAccountById,
    listAccounts,
    updateAccount,
} from './account.service.js'

const accountRoutes = new Hono<AppBindings>()

accountRoutes.get('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const query = parseOrThrow(getAccountsQuerySchema, c.req.query())
    const accounts = await listAccounts(authUser, query)
    return c.json(successResponse(accounts))
})

accountRoutes.post('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const input = await validateBody(c, createAccountSchema)
    const account = await createAccount(authUser, input)
    return c.json(successResponse(account), 201)
})

accountRoutes.get('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(accountParamsSchema, c.req.param())
    const account = await getAccountById(authUser, params.id)
    return c.json(successResponse(account))
})

accountRoutes.patch('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(accountParamsSchema, c.req.param())
    const input = await validateBody(c, updateAccountSchema)
    const account = await updateAccount(authUser, params.id, input)
    return c.json(successResponse(account))
})

accountRoutes.delete('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(accountParamsSchema, c.req.param())
    const account = await archiveAccount(authUser, params.id)
    return c.json(successResponse(account))
})

export { accountRoutes }
