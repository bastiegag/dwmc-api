import type { ErrorCode } from '../errors/AppError.js'

/** Wraps any successful payload in the standard `{ data }` envelope. */
export function successResponse<T>(data: T) {
    return { data }
}

/** Wraps a paginated list in `{ data, nextCursor }` where nextCursor is null on the last page. */
export function paginatedResponse<T>(data: T[], nextCursor: string | null) {
    return { data, nextCursor }
}

/** Wraps an error in the standard `{ error: { code, message, issues? } }` envelope. */
export function errorResponse(code: ErrorCode, message: string, issues?: unknown) {
    return {
        error: {
            code,
            message,
            ...(issues !== undefined ? { issues } : {}),
        },
    }
}
