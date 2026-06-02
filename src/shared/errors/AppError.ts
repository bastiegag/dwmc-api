/**
 * Typed error codes used across the application.
 * Each code maps to a specific HTTP status in ErrorCodes below.
 */
export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'INTERNAL_SERVER_ERROR'

export const ErrorCodes: Record<ErrorCode, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    VALIDATION_ERROR: 422,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
}

/**
 * AppError is the single error type thrown by all modules.
 * It carries a structured code, HTTP status, and optional Zod validation issues.
 * The central error handler converts it into the standard API error response.
 */
export class AppError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly statusCode: number,
        public readonly issues?: unknown,
    ) {
        super(message)
        this.name = 'AppError'
    }
}
