import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../app.js'
import { prisma } from '../db/prisma.js'
import { supabase } from '../lib/supabase.js'
import {
    authHeader,
    createSupabaseGetUserMock,
    TEST_AUTH_USER_1,
    TEST_AUTH_USER_2,
} from './test-utils.js'

/* eslint-disable @typescript-eslint/no-explicit-any -- Vitest/Prisma mock interop */

vi.mock('../lib/supabase.js', () => ({
    supabase: { auth: { getUser: vi.fn() } },
}))

vi.mock('../db/prisma.js', () => ({
    prisma: {
        userProfile: {
            upsert: vi.fn(),
            update: vi.fn(),
        },
    },
}))

type Profile = {
    id: string
    authUserId: string
    email: string | null
    firstName: string | null
    lastName: string | null
    displayName: string | null
    preferredCurrency: string
    locale: string
    createdAt: Date
    updatedAt: Date
}

const profiles = new Map<string, Profile>()

const clone = <T>(value: T): T => structuredClone(value)

const configureMocks = () => {
    vi.mocked(supabase.auth.getUser).mockImplementation(
        createSupabaseGetUserMock(undefined, 'Invalid JWT') as never,
    )
    ;(prisma.userProfile.upsert as any).mockImplementation(
        async ({ where, update, create }: any) => {
            const existing = profiles.get(where.authUserId)
            if (existing) {
                const updated = {
                    ...existing,
                    email: update.email ?? existing.email,
                    updatedAt: new Date(),
                }
                profiles.set(where.authUserId, updated)
                return clone(updated)
            }
            const profile: Profile = {
                id: `profile-${where.authUserId}`,
                authUserId: create.authUserId,
                email: create.email ?? null,
                firstName: null,
                lastName: null,
                displayName: null,
                preferredCurrency: 'CAD',
                locale: 'fr-CA',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
            profiles.set(where.authUserId, profile)
            return clone(profile)
        },
    )
    ;(prisma.userProfile.update as any).mockImplementation(async ({ where, data }: any) => {
        const profile = profiles.get(where.authUserId)
        if (!profile) throw new Error('Profile not found')
        const updated = { ...profile, ...data, updatedAt: new Date() }
        profiles.set(where.authUserId, updated)
        return clone(updated)
    })
}

const request = (path: string, token = TEST_AUTH_USER_1.token, init?: RequestInit) =>
    app.request(path, { ...init, headers: { ...authHeader(token), ...init?.headers } })

describe('Profile API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        profiles.clear()
        configureMocks()
    })

    it('rejects anonymous requests', async () => {
        const response = await app.request('/api/v1/profile')
        expect(response.status).toBe(401)
    })

    it('creates one profile on first GET and returns the same profile repeatedly', async () => {
        const first = await request('/api/v1/profile')
        const second = await request('/api/v1/profile')
        const firstBody: any = await first.json()
        const secondBody: any = await second.json()

        expect(first.status).toBe(200)
        expect(firstBody.data.id).toBe(secondBody.data.id)
        expect(profiles).toHaveLength(1)
        expect(firstBody.data.authUserId).toBe(TEST_AUTH_USER_1.id)
    })

    it('updates editable fields and ignores identity fields by rejecting them', async () => {
        await request('/api/v1/profile')
        const response = await request('/api/v1/profile', TEST_AUTH_USER_1.token, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstName: ' Ada ',
                displayName: 'Ada',
                preferredCurrency: 'USD',
            }),
        })
        const body: any = await response.json()

        expect(response.status).toBe(200)
        expect(body.data.firstName).toBe('Ada')
        expect(body.data.preferredCurrency).toBe('USD')
        expect(body.data.authUserId).toBe(TEST_AUTH_USER_1.id)

        const injection = await request('/api/v1/profile', TEST_AUTH_USER_1.token, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'other', authUserId: TEST_AUTH_USER_2.id }),
        })
        expect(injection.status).toBe(422)
    })

    it('supports partial updates and rejects invalid currency and lengths', async () => {
        await request('/api/v1/profile')
        const partial = await request('/api/v1/profile', TEST_AUTH_USER_1.token, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastName: 'Lovelace' }),
        })
        expect(partial.status).toBe(200)

        const invalidCurrency = await request('/api/v1/profile', TEST_AUTH_USER_1.token, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preferredCurrency: 'GBP' }),
        })
        expect(invalidCurrency.status).toBe(422)

        const invalidLength = await request('/api/v1/profile', TEST_AUTH_USER_1.token, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName: 'x'.repeat(81) }),
        })
        expect(invalidLength.status).toBe(422)
    })

    it('isolates profiles by authenticated JWT subject', async () => {
        const userOne = await request('/api/v1/profile', TEST_AUTH_USER_1.token)
        const userTwo = await request('/api/v1/profile', TEST_AUTH_USER_2.token)
        const firstBody: any = await userOne.json()
        const secondBody: any = await userTwo.json()

        expect(firstBody.data.id).not.toBe(secondBody.data.id)
        expect(firstBody.data.authUserId).toBe(TEST_AUTH_USER_1.id)
        expect(secondBody.data.authUserId).toBe(TEST_AUTH_USER_2.id)
        expect(profiles).toHaveLength(2)
    })
})
