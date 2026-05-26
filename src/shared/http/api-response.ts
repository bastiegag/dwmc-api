import type { ErrorCode } from '../errors/AppError.js'

/** Wraps any successful payload in the standard `{ data }` envelope. */
export function successResponse<T>(data: T) {
  return { data }
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
