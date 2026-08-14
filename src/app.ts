import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppBindings } from './types/app.js'
import { env } from './config/env.js'
import { requestLogger } from './shared/logger/request-logger.js'
import { handleError } from './shared/errors/error-handler.js'
import { successResponse, errorResponse } from './shared/http/api-response.js'
import { prisma } from './db/prisma.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { sectionRoutes } from './modules/sections/section.routes.js'
import { categoryRoutes } from './modules/categories/category.routes.js'
import { accountRoutes } from './modules/accounts/account.routes.js'
import { transactionRoutes } from './modules/transactions/transaction.routes.js'
import { summaryRoutes } from './modules/summary/summary.routes.js'
import { budgetRoutes } from './modules/budgets/budget.routes.js'
import { profileRoutes } from './modules/profile/profile.routes.js'

const app = new Hono<AppBindings>()

// ── Middleware ──────────────────────────────────────────────────────────────

app.use(
    '*',
    cors({
        origin: env.APP_ORIGIN,
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
)
app.use('*', requestLogger)

// ── Error handler ───────────────────────────────────────────────────────────

app.onError(handleError)

// ── Public health endpoints ─────────────────────────────────────────────────

/** Returns 200 immediately if the process is alive. */
app.get('/health', (c) => {
    return c.json(successResponse({ status: 'ok' }))
})

/**
 * Verifies the database connection is reachable.
 * Returns 503 (with a structured error body) if the database is unavailable.
 */
app.get('/ready', async (c) => {
    try {
        await prisma.$queryRaw`SELECT 1`
        return c.json(successResponse({ status: 'ready', database: 'connected' }))
    } catch {
        return c.json(errorResponse('INTERNAL_SERVER_ERROR', 'Database unavailable'), 503)
    }
})

// ── API routes ──────────────────────────────────────────────────────────────

app.route('/api/v1/auth', authRoutes)
app.route('/api/v1/sections', sectionRoutes)
app.route('/api/v1/categories', categoryRoutes)
app.route('/api/v1/accounts', accountRoutes)
app.route('/api/v1/transactions', transactionRoutes)
app.route('/api/v1/summary', summaryRoutes)
app.route('/api/v1/budgets', budgetRoutes)
app.route('/api/v1/profile', profileRoutes)

export { app }
