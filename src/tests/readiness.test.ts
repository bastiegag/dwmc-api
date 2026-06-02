import { describe, it, expect, vi } from 'vitest'
import { app } from '../app.js'
import { prisma } from '../db/prisma.js'

// Replace the Prisma singleton with a lightweight mock so tests never hit a
// real database.  The mock must be defined before `app` is first imported.
vi.mock('../db/prisma.js', () => ({
    prisma: {
        $queryRaw: vi.fn(),
        userProfile: {
            upsert: vi.fn(),
        },
    },
}))

describe('GET /ready', () => {
    it('returns 200 with status ready when the database is connected', async () => {
        vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }])

        const res = await app.request('/ready')
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body).toEqual({ data: { status: 'ready', database: 'connected' } })
    })

    it('returns 503 when the database is unavailable', async () => {
        vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('Connection refused'))

        const res = await app.request('/ready')
        expect(res.status).toBe(503)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = await res.json()
        expect(body.error.code).toBe('INTERNAL_SERVER_ERROR')
    })
})
