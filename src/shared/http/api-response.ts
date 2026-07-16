import type { ErrorCode } from '../errors/AppError.js'

export type PageMeta = {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

/** Wraps any successful payload in the standard `{ data }` envelope. */
export const successResponse = <T>(data: T) => {
    return { data }
}

/** Wraps a paginated list in `{ data, nextCursor }` where nextCursor is null on the last page. */
export const paginatedResponse = <T>(data: T[], nextCursor: string | null) => {
    return { data, nextCursor }
}

/** Wraps an offset-paginated list in `{ data, meta }`. */
export const paginatedMetaResponse = <T>(data: T[], meta: PageMeta) => {
    return { data, meta }
}

/** Wraps an error in the standard `{ error: { code, message, issues? } }` envelope. */
export const errorResponse = (code: ErrorCode, message: string, issues?: unknown) => {
    return {
        error: {
            code,
            message,
            ...(issues !== undefined ? { issues } : {}),
        },
    }
}
