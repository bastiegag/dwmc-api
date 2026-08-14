import { describe, expect, it } from 'vitest'
import { app } from '../app.js'

describe('CORS', () => {
    it('allows the configured frontend origin and bearer requests', async () => {
        const res = await app.request('/api/v1/auth/me', {
            method: 'OPTIONS',
            headers: {
                Origin: 'http://localhost:5173',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Authorization',
            },
        })

        expect(res.status).toBe(204)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
        expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
    })

    it('does not allow an unconfigured origin', async () => {
        const res = await app.request('/health', {
            headers: { Origin: 'https://unexpected.example' },
        })

        expect(res.status).toBe(200)
        expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })
})
