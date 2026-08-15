import type { MiddlewareHandler } from 'hono'
import { randomUUID } from 'node:crypto'

/** Adds a request ID and logs a structured request summary. */
export const requestLogger: MiddlewareHandler = async (c, next) => {
    const start = Date.now()
    const { method } = c.req.raw
    const requestId = randomUUID()
    c.set('requestId', requestId)
    c.header('X-Request-ID', requestId)

    try {
        await next()
    } finally {
        console.log(
            JSON.stringify({
                requestId,
                method,
                path: new URL(c.req.url).pathname,
                status: c.res.status || 500,
                durationMs: Date.now() - start,
            }),
        )
    }
}
