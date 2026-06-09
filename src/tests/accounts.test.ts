import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../app.js'
import { prisma } from '../db/prisma.js'
import { supabase } from '../lib/supabase.js'

type SuccessBody<T> = { data: T }
type ErrorBody = { error: { code: string; message: string } }

vi.mock('../lib/supabase.js', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
        },
    },
}))

vi.mock('../db/prisma.js', () => ({
    prisma: {
        $queryRaw: vi.fn(),
        userProfile: {
            upsert: vi.fn(),
        },
        account: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
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
    currency: string
    locale: string
    createdAt: Date
    updatedAt: Date
}

type Account = {
    id: string
    userProfileId: string
    name: string
    type: string
    startingBalance: number
    goal: number | null
    color: string
    icon: string
    isArchived: boolean
    createdAt: Date
    updatedAt: Date
}

type SerializedAccount = {
    id: string
    userProfileId: string
    name: string
    type: string
    startingBalance: number
    currentBalance: number
    goal: number | null
    color: string
    icon: string
    isArchived: boolean
    createdAt: string
    updatedAt: string
}

const BEARER = 'Bearer '
const TOKEN_USER_1 = 'token-user-1'
const TOKEN_USER_2 = 'token-user-2'

const profilesByAuthUserId = new Map<string, Profile>()
let accounts: Account[] = []
let accountCounter = 1

function authHeader(token: string) {
    return { Authorization: `${BEARER}${token}` }
}

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Vitest/Prisma mock interop */
function configureSupabaseMock() {
    ;(supabase.auth.getUser as any).mockImplementation(async (token: string) => {
        if (token === TOKEN_USER_1) {
            return {
                data: { user: { id: 'auth-user-1', email: 'user1@example.com' } as any },
                error: null,
            }
        }

        if (token === TOKEN_USER_2) {
            return {
                data: { user: { id: 'auth-user-2', email: 'user2@example.com' } as any },
                error: null,
            }
        }

        return {
            data: { user: null },
            error: { message: 'Invalid JWT' } as any,
        }
    })
}

function configurePrismaMocks() {
    ;(prisma.userProfile.upsert as any).mockImplementation(
        async ({ where, update, create }: any) => {
            const existing = profilesByAuthUserId.get(where.authUserId)
            if (existing) {
                const next = {
                    ...existing,
                    email: update.email ?? existing.email,
                    updatedAt: new Date(),
                }
                profilesByAuthUserId.set(where.authUserId, next)
                return clone(next)
            }

            const profile: Profile = {
                id: `profile-${where.authUserId}`,
                authUserId: create.authUserId,
                email: create.email ?? null,
                firstName: null,
                lastName: null,
                currency: 'CAD',
                locale: 'fr-CA',
                createdAt: new Date(),
                updatedAt: new Date(),
            }
            profilesByAuthUserId.set(where.authUserId, profile)
            return clone(profile)
        },
    )
    ;(prisma.account.findMany as any).mockImplementation(async ({ where, orderBy }: any) => {
        let result = accounts.filter((account) => account.userProfileId === where.userProfileId)

        if (where.isArchived !== undefined) {
            result = result.filter((account) => account.isArchived === where.isArchived)
        }

        if (where.type !== undefined) {
            result = result.filter((account) => account.type === where.type)
        }

        if (orderBy?.name === 'asc') {
            result = [...result].sort((a, b) => a.name.localeCompare(b.name))
        }

        return clone(result)
    })
    ;(prisma.account.findFirst as any).mockImplementation(async ({ where }: any) => {
        const found = accounts.find((account) => {
            if (typeof where.id === 'string' && account.id !== where.id) return false
            if (where.id && typeof where.id === 'object' && 'not' in where.id) {
                if (account.id === where.id.not) return false
            }
            if (where.userProfileId && account.userProfileId !== where.userProfileId) return false
            if (where.name !== undefined && account.name !== where.name) return false
            return true
        })

        return found ? clone(found) : null
    })
    ;(prisma.account.create as any).mockImplementation(async ({ data }: any) => {
        const now = new Date()
        const account: Account = {
            id: `account-${accountCounter++}`,
            userProfileId: data.userProfileId,
            name: data.name,
            type: data.type ?? 'CHECKING',
            startingBalance: data.startingBalance ?? 0,
            goal: data.goal ?? null,
            color: data.color,
            icon: data.icon,
            isArchived: false,
            createdAt: now,
            updatedAt: now,
        }

        accounts.push(account)
        return clone(account)
    })
    ;(prisma.account.update as any).mockImplementation(async ({ where, data }: any) => {
        const index = accounts.findIndex(
            (account) => account.id === where.id && account.userProfileId === where.userProfileId,
        )

        if (index < 0) {
            throw new Error('Account not found')
        }

        const current = accounts[index] as Account
        const next: Account = {
            ...current,
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.type !== undefined ? { type: data.type } : {}),
            ...(data.startingBalance !== undefined
                ? { startingBalance: data.startingBalance }
                : {}),
            ...(data.goal !== undefined ? { goal: data.goal } : {}),
            ...(data.color !== undefined ? { color: data.color } : {}),
            ...(data.icon !== undefined ? { icon: data.icon } : {}),
            ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
            updatedAt: new Date(),
        }

        accounts[index] = next
        return clone(next)
    })
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('Accounts API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        profilesByAuthUserId.clear()
        accounts = []
        accountCounter = 1

        configureSupabaseMock()
        configurePrismaMocks()
    })

    it('GET /api/v1/accounts without token returns 401', async () => {
        const res = await app.request('/api/v1/accounts')
        expect(res.status).toBe(401)
    })

    it('POST /api/v1/accounts without token returns 401', async () => {
        const res = await app.request('/api/v1/accounts', { method: 'POST' })
        expect(res.status).toBe(401)
    })

    it('creating an account validates required fields', async () => {
        const res = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: '', color: '', icon: '' }),
        })

        expect(res.status).toBe(422)
        const body = (await res.json()) as ErrorBody
        expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('creating an account trims the name', async () => {
        const res = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: '  Checking  ', color: '#3b82f6', icon: 'wallet' }),
        })

        expect(res.status).toBe(201)
        const body = (await res.json()) as SuccessBody<SerializedAccount>
        expect(body.data.name).toBe('Checking')
    })

    it('creating an account defaults type to CHECKING if not provided', async () => {
        const res = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'My Account', color: '#3b82f6', icon: 'wallet' }),
        })

        expect(res.status).toBe(201)
        const body = (await res.json()) as SuccessBody<SerializedAccount>
        expect(body.data.type).toBe('CHECKING')
    })

    it('creating an account defaults startingBalance to 0 if not provided', async () => {
        const res = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'My Account', color: '#3b82f6', icon: 'wallet' }),
        })

        expect(res.status).toBe(201)
        const body = (await res.json()) as SuccessBody<SerializedAccount>
        expect(body.data.startingBalance).toBe(0)
    })

    it('creating a duplicate account for the same user returns 409', async () => {
        await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking', color: '#3b82f6', icon: 'wallet' }),
        })

        const res = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking', color: '#ef4444', icon: 'credit-card' }),
        })

        expect(res.status).toBe(409)
        const body = (await res.json()) as ErrorBody
        expect(body.error.code).toBe('CONFLICT')
    })

    it('listing accounts only returns accounts for the authenticated user', async () => {
        await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking', color: '#3b82f6', icon: 'wallet' }),
        })

        await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_2),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Savings', color: '#22c55e', icon: 'piggy-bank' }),
        })

        const res = await app.request('/api/v1/accounts', {
            headers: authHeader(TOKEN_USER_1),
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as SuccessBody<SerializedAccount[]>
        expect(body.data).toHaveLength(1)
        expect(body.data[0]!.name).toBe('Checking')
    })

    it('listing accounts excludes archived accounts by default', async () => {
        const createRes = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking', color: '#3b82f6', icon: 'wallet' }),
        })
        const created = (await createRes.json()) as SuccessBody<SerializedAccount>

        await app.request(`/api/v1/accounts/${created.data.id}`, {
            method: 'DELETE',
            headers: authHeader(TOKEN_USER_1),
        })

        const res = await app.request('/api/v1/accounts', {
            headers: authHeader(TOKEN_USER_1),
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as SuccessBody<SerializedAccount[]>
        expect(body.data).toHaveLength(0)
    })

    it('includeArchived=true includes archived accounts', async () => {
        const createRes = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking', color: '#3b82f6', icon: 'wallet' }),
        })
        const created = (await createRes.json()) as SuccessBody<SerializedAccount>

        await app.request(`/api/v1/accounts/${created.data.id}`, {
            method: 'DELETE',
            headers: authHeader(TOKEN_USER_1),
        })

        const res = await app.request('/api/v1/accounts?includeArchived=true', {
            headers: authHeader(TOKEN_USER_1),
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as SuccessBody<SerializedAccount[]>
        expect(body.data).toHaveLength(1)
        expect(body.data[0]!.isArchived).toBe(true)
    })

    it('filtering by type works', async () => {
        await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Checking',
                type: 'CHECKING',
                color: '#3b82f6',
                icon: 'wallet',
            }),
        })

        await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Visa',
                type: 'CREDIT_CARD',
                color: '#ef4444',
                icon: 'credit-card',
            }),
        })

        const res = await app.request('/api/v1/accounts?type=CREDIT_CARD', {
            headers: authHeader(TOKEN_USER_1),
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as SuccessBody<SerializedAccount[]>
        expect(body.data).toHaveLength(1)
        expect(body.data[0]!.name).toBe('Visa')
    })

    it("GET /api/v1/accounts/:id returns 404 for another user's account", async () => {
        const createRes = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_2),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Savings', color: '#22c55e', icon: 'piggy-bank' }),
        })
        const created = (await createRes.json()) as SuccessBody<SerializedAccount>

        const res = await app.request(`/api/v1/accounts/${created.data.id}`, {
            headers: authHeader(TOKEN_USER_1),
        })

        expect(res.status).toBe(404)
    })

    it("PATCH /api/v1/accounts/:id updates only the authenticated user's account", async () => {
        const createRes = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking', color: '#3b82f6', icon: 'wallet' }),
        })
        const created = (await createRes.json()) as SuccessBody<SerializedAccount>

        const res = await app.request(`/api/v1/accounts/${created.data.id}`, {
            method: 'PATCH',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Main Checking' }),
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as SuccessBody<SerializedAccount>
        expect(body.data.name).toBe('Main Checking')

        const otherUserRes = await app.request(`/api/v1/accounts/${created.data.id}`, {
            method: 'PATCH',
            headers: {
                ...authHeader(TOKEN_USER_2),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Not Allowed' }),
        })
        expect(otherUserRes.status).toBe(404)
    })

    it('PATCH /api/v1/accounts/:id prevents duplicate account names', async () => {
        await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking', color: '#3b82f6', icon: 'wallet' }),
        })

        const createRes = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Savings', color: '#22c55e', icon: 'piggy-bank' }),
        })
        const created = (await createRes.json()) as SuccessBody<SerializedAccount>

        const res = await app.request(`/api/v1/accounts/${created.data.id}`, {
            method: 'PATCH',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking' }),
        })

        expect(res.status).toBe(409)
        const body = (await res.json()) as ErrorBody
        expect(body.error.code).toBe('CONFLICT')
    })

    it('DELETE /api/v1/accounts/:id soft deletes by setting isArchived to true', async () => {
        const createRes = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Checking', color: '#3b82f6', icon: 'wallet' }),
        })
        const created = (await createRes.json()) as SuccessBody<SerializedAccount>

        const res = await app.request(`/api/v1/accounts/${created.data.id}`, {
            method: 'DELETE',
            headers: authHeader(TOKEN_USER_1),
        })

        expect(res.status).toBe(200)
        const body = (await res.json()) as SuccessBody<SerializedAccount>
        expect(body.data.isArchived).toBe(true)
    })

    it('currentBalance is returned and equals startingBalance', async () => {
        const res = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Checking',
                startingBalance: 1250.75,
                color: '#3b82f6',
                icon: 'wallet',
            }),
        })

        expect(res.status).toBe(201)
        const body = (await res.json()) as SuccessBody<SerializedAccount>
        expect(body.data.startingBalance).toBe(1250.75)
        expect(body.data.currentBalance).toBe(1250.75)
        expect(body.data.currentBalance).toBe(body.data.startingBalance)
    })

    it('negative startingBalance is allowed for credit cards or loans', async () => {
        const res = await app.request('/api/v1/accounts', {
            method: 'POST',
            headers: {
                ...authHeader(TOKEN_USER_1),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Credit Card',
                type: 'CREDIT_CARD',
                startingBalance: -850,
                color: '#ef4444',
                icon: 'credit-card',
            }),
        })

        expect(res.status).toBe(201)
        const body = (await res.json()) as SuccessBody<SerializedAccount>
        expect(body.data.startingBalance).toBe(-850)
        expect(body.data.currentBalance).toBe(-850)
    })
})
