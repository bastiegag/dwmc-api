import type { MiddlewareHandler } from 'hono'

/** Logs method, URL, status code, and duration for every request. */
export const requestLogger: MiddlewareHandler = async (c, next) => {
    const start = Date.now()
    const { method } = c.req.raw
    const url = c.req.url

    await next()

    const duration = Date.now() - start
    const status = c.res.status
    console.log(`${method} ${url} ${status} ${duration}ms`)
}
