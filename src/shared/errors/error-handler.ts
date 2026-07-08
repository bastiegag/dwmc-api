import type { Context } from 'hono'
import { AppError } from './AppError.js'
import { errorResponse } from '../http/api-response.js'

/**
 * Central error handler wired to app.onError().
 * - AppError instances are serialised with their typed code and HTTP status.
 * - Unknown errors (bugs, third-party throws) produce a generic 500 response
 *   so internal details are never leaked to the client.
 */
export const handleError = (err: Error | unknown, c: Context): Response => {
    if (err instanceof AppError) {
        return c.json(errorResponse(err.code, err.message, err.issues), err.statusCode as 400)
    }

    console.error('Unhandled error:', err)
    return c.json(errorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred'), 500)
}
