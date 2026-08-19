import { describe, it, expect } from 'vitest'
import { app } from '../app.js'

describe('GET /health', () => {
    it('returns 200 with status ok', async () => {
        const res = await app.request('/health')
        expect(res.status).toBe(200)
        expect(res.headers.get('X-Request-ID')).toMatch(/^[0-9a-f-]{36}$/)
        const body = await res.json()
        expect(body).toEqual({ data: { status: 'ok' } })
    })

    it('includes standard security headers', async () => {
        const res = await app.request('/health')

        expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
        expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    })

    it('rejects oversized request bodies', async () => {
        const body = JSON.stringify({ value: 'x'.repeat(1024 * 1024) })
        const res = await app.request('/health', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        })

        expect(res.status).toBe(413)
    })
})
