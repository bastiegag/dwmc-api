import type { Context } from 'hono'
import type { z } from 'zod'
import { type ZodTypeAny } from 'zod'
import { AppError, ErrorCodes } from '../errors/AppError.js'

/**
 * Parses an arbitrary input against a Zod schema and returns the typed value.
 * Throws an AppError (VALIDATION_ERROR) if validation fails.
 * Use this for params and query strings; use validateBody for request bodies.
 */
export const parseOrThrow = <T extends ZodTypeAny>(schema: T, input: unknown): z.output<T> => {
    const result = schema.safeParse(input)
    if (!result.success) {
        throw new AppError(
            'VALIDATION_ERROR',
            'Validation failed',
            ErrorCodes.VALIDATION_ERROR,
            result.error.flatten(),
        )
    }

    return result.data
}

/**
 * Parses the request JSON body against a Zod schema and returns the typed value.
 * Throws an AppError (VALIDATION_ERROR) if the body is malformed or fails validation.
 */
export const validateBody = async <T extends ZodTypeAny>(
    c: Context,
    schema: T,
): Promise<z.output<T>> => {
    const body = await c.req.json().catch(() => {
        throw new AppError('VALIDATION_ERROR', 'Invalid JSON body', ErrorCodes.VALIDATION_ERROR)
    })

    const result = schema.safeParse(body)
    if (!result.success) {
        throw new AppError(
            'VALIDATION_ERROR',
            'Validation failed',
            ErrorCodes.VALIDATION_ERROR,
            result.error.flatten(),
        )
    }

    return result.data as z.output<T>
}
