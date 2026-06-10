import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { successResponse } from '../../shared/http/api-response.js'
import { parseOrThrow, validateBody } from '../../shared/validation/validate.js'
import {
    createTransactionSchema,
    getTransactionsQuerySchema,
    transactionParamsSchema,
    updateTransactionSchema,
} from './transaction.schema.js'
import {
    createTransaction,
    getTransactionById,
    listTransactions,
    updateTransaction,
    archiveTransaction,
} from './transaction.service.js'

const transactionRoutes = new Hono<AppBindings>()

transactionRoutes.get('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const query = parseOrThrow(getTransactionsQuerySchema, c.req.query())
    const result = await listTransactions(authUser, query)
    return c.json({ data: result.items, meta: result.meta })
})

transactionRoutes.post('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const input = await validateBody(c, createTransactionSchema)
    const tx = await createTransaction(authUser, input)
    return c.json(successResponse(tx), 201)
})

transactionRoutes.get('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(transactionParamsSchema, c.req.param())
    const tx = await getTransactionById(authUser, params.id)
    return c.json(successResponse(tx))
})

transactionRoutes.patch('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(transactionParamsSchema, c.req.param())
    const input = await validateBody(c, updateTransactionSchema)
    const tx = await updateTransaction(authUser, params.id, input)
    return c.json(successResponse(tx))
})

transactionRoutes.delete('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(transactionParamsSchema, c.req.param())
    const tx = await archiveTransaction(authUser, params.id)
    return c.json(successResponse(tx))
})

export { transactionRoutes }
