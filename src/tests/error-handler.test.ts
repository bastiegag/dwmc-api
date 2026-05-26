/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { AppError } from '../shared/errors/AppError.js'
import { handleError } from '../shared/errors/error-handler.js'

function buildApp() {
  const app = new Hono()
  app.onError(handleError)
  return app
}

describe('handleError', () => {
  it('serialises AppError to the standard error envelope', async () => {
    const app = buildApp()
    app.get('/test', () => {
      throw new AppError('NOT_FOUND', 'Resource not found', 404)
    })

    const res = await app.request('/test')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    })
  })

  it('includes issues when provided', async () => {
    const app = buildApp()
    app.get('/test', () => {
      throw new AppError('VALIDATION_ERROR', 'Validation failed', 422, { field: ['required'] })
    })

    const res = await app.request('/test')
    expect(res.status).toBe(422)
    const body: any = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.issues).toEqual({ field: ['required'] })
  })

  it('returns 500 INTERNAL_SERVER_ERROR for unknown errors', async () => {
    const app = buildApp()
    app.get('/test', () => {
      throw new Error('Unexpected crash')
    })

    const res = await app.request('/test')
    expect(res.status).toBe(500)
    const body: any = await res.json()
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
    expect(body.error.message).toBe('An unexpected error occurred')
  })
})
