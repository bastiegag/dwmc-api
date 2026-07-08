/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../app.js'
import { prisma } from '../db/prisma.js'
import { supabase } from '../lib/supabase.js'
import { TEST_AUTH_USER_1, authHeader, clone, createSupabaseGetUserMock } from './test-utils.js'

type SuccessBody<T> = { data: T }
// ErrorBody type removed — tests use inline assertions or cast responses to `any`.

vi.mock('../lib/supabase.js', () => ({
    supabase: {
        auth: { getUser: vi.fn() },
    },
}))

vi.mock('../db/prisma.js', () => ({
    prisma: {
        $queryRaw: vi.fn(),
        userProfile: { upsert: vi.fn() },
        account: { findFirst: vi.fn(), findMany: vi.fn() },
        category: { findFirst: vi.fn() },
        transaction: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
            aggregate: vi.fn(),
        },
    },
}))

const TOKEN_USER_1 = TEST_AUTH_USER_1.token

const profilesByAuthUserId = new Map<string, any>()
let accounts: any[] = []
let categories: any[] = []
let transactions: any[] = []
let txCounter = 1
let accountCounter = 1
// categoryCounter not used in these tests

const configureSupabaseMock = () => {
    ;(supabase.auth.getUser as any).mockImplementation(
        createSupabaseGetUserMock(undefined, 'Invalid'),
    )
}

const configurePrismaMocks = () => {
    ;(prisma.userProfile.upsert as any).mockImplementation(
        async ({ where, create, update }: any) => {
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
            const profile = {
                id: `profile-${where.authUserId}`,
                authUserId: create.authUserId,
                email: create.email ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
            profilesByAuthUserId.set(where.authUserId, profile)
            return clone(profile)
        },
    )
    ;(prisma.account.findFirst as any).mockImplementation(async ({ where }: any) => {
        return clone(
            accounts.find((a) => a.id === where.id && a.userProfileId === where.userProfileId) ??
                null,
        )
    })
    ;(prisma.category.findFirst as any).mockImplementation(async ({ where }: any) => {
        return clone(
            categories.find((c) => c.id === where.id && c.userProfileId === where.userProfileId) ??
                null,
        )
    })
    ;(prisma.transaction.findMany as any).mockImplementation(async ({ where, skip, take }: any) => {
        let result = transactions.filter((t) => t.userProfileId === where.userProfileId)
        if (where.isArchived !== undefined)
            result = result.filter((t) => t.isArchived === where.isArchived)
        if (where.type) result = result.filter((t) => t.type === where.type)
        if (where.accountId) result = result.filter((t) => t.accountId === where.accountId)
        if (where.categoryId) result = result.filter((t) => t.categoryId === where.categoryId)
        // naive ordering by date desc
        result = result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        if (skip) result = result.slice(skip)
        if (take) result = result.slice(0, take)
        return clone(result)
    })
    ;(prisma.transaction.count as any).mockImplementation(async ({ where }: any) => {
        return transactions.filter(
            (t) =>
                t.userProfileId === where.userProfileId &&
                (where.isArchived === undefined ? true : t.isArchived === where.isArchived) &&
                (where.type ? t.type === where.type : true) &&
                (where.accountId ? t.accountId === where.accountId : true) &&
                (where.categoryId ? t.categoryId === where.categoryId : true),
        ).length
    })
    ;(prisma.transaction.findFirst as any).mockImplementation(async ({ where }: any) => {
        return clone(
            transactions.find(
                (t) => t.id === where.id && t.userProfileId === where.userProfileId,
            ) ?? null,
        )
    })
    ;(prisma.transaction.create as any).mockImplementation(async ({ data }: any) => {
        const now = new Date()
        const tx = {
            id: `tx-${txCounter++}`,
            userProfileId: data.userProfileId,
            type: data.type,
            amount: data.amount,
            date: data.date,
            merchant: data.merchant,
            note: data.note,
            accountId: data.accountId ?? null,
            fromAccountId: data.fromAccountId ?? null,
            toAccountId: data.toAccountId ?? null,
            categoryId: data.categoryId ?? null,
            isArchived: false,
            createdAt: now,
            updatedAt: now,
            account: data.accountId
                ? { id: data.accountId, name: 'acct', color: '#000', icon: 'icon' }
                : null,
            fromAccount: data.fromAccountId
                ? { id: data.fromAccountId, name: 'from', color: '#000', icon: 'icon' }
                : null,
            toAccount: data.toAccountId
                ? { id: data.toAccountId, name: 'to', color: '#000', icon: 'icon' }
                : null,
            category: data.categoryId
                ? { id: data.categoryId, name: 'cat', icon: 'i', sectionId: 's1' }
                : null,
        }
        transactions.push(tx)
        return clone(tx)
    })
    ;(prisma.transaction.update as any).mockImplementation(async ({ where, data }: any) => {
        const idx = transactions.findIndex(
            (t) => t.id === where.id && t.userProfileId === where.userProfileId,
        )
        if (idx < 0) throw new Error('Not found')
        const current = transactions[idx]
        const next = { ...current, ...(data as any), updatedAt: new Date() }
        transactions[idx] = next
        return clone(next)
    })
    ;(prisma.transaction.aggregate as any).mockImplementation(async ({ _sum, where }: any) => {
        const list = transactions.filter(
            (t) => t.userProfileId === where.userProfileId && !t.isArchived,
        )
        let filtered = list
        if (where.type) filtered = filtered.filter((t) => t.type === where.type)
        if (where.accountId) filtered = filtered.filter((t) => t.accountId === where.accountId)
        if (where.toAccountId)
            filtered = filtered.filter((t) => t.toAccountId === where.toAccountId)
        if (where.fromAccountId)
            filtered = filtered.filter((t) => t.fromAccountId === where.fromAccountId)
        const sum = filtered.reduce((s, t) => s + Number(t.amount), 0)
        return { _sum: { amount: sum } }
    })
}

describe('Transactions API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        profilesByAuthUserId.clear()
        accounts = []
        categories = []
        transactions = []
        txCounter = 1
        accountCounter = 1
        // no-op for category counter

        configureSupabaseMock()
        configurePrismaMocks()
    })

    it('GET /api/v1/transactions without token returns 401', async () => {
        const res = await app.request('/api/v1/transactions')
        expect(res.status).toBe(401)
    })

    it('POST /api/v1/transactions without token returns 401', async () => {
        const res = await app.request('/api/v1/transactions', { method: 'POST' })
        expect(res.status).toBe(401)
    })

    it('Creating INCOME requires accountId', async () => {
        const res = await app.request('/api/v1/transactions', {
            method: 'POST',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'INCOME', amount: 10, date: '2026-06-01' }),
        })
        expect(res.status).toBe(422)
    })

    it('Creating TRANSFER rejects same from/to', async () => {
        const res = await app.request('/api/v1/transactions', {
            method: 'POST',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'TRANSFER',
                amount: 10,
                date: '2026-06-01',
                fromAccountId: 'a1',
                toAccountId: 'a1',
            }),
        })
        expect(res.status).toBe(422)
    })

    it('ADJUSTMENT can be negative', async () => {
        // create account for user
        const profileRes = await app.request('/api/v1/auth/me', {
            headers: authHeader(TOKEN_USER_1),
        })
        await profileRes.json()
        // add account to in-memory store
        const acc = {
            id: `account-${accountCounter++}`,
            userProfileId: `profile-auth-user-1`,
            name: 'A',
            type: 'CHECKING',
            startingBalance: 0,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        }
        accounts.push(acc)

        const res = await app.request('/api/v1/transactions', {
            method: 'POST',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'ADJUSTMENT',
                amount: -5,
                date: '2026-06-02',
                accountId: acc.id,
            }),
        })

        expect(res.status).toBe(201)
        const body = (await res.json()) as SuccessBody<any>
        expect(body.data.amount).toBe(-5)
    })

    it('Creating transaction validates account ownership', async () => {
        // Create an account for user2
        const a = {
            id: 'acct-u2',
            userProfileId: 'profile-auth-user-2',
            name: 'X',
            type: 'CHECKING',
            startingBalance: 0,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        }
        accounts.push(a)

        const res = await app.request('/api/v1/transactions', {
            method: 'POST',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'INCOME',
                amount: 10,
                date: '2026-06-01',
                accountId: a.id,
            }),
        })

        expect(res.status).toBe(404)
    })

    it('Listing excludes archived by default and includeArchived=true includes archived', async () => {
        // create account for user1
        const acc = {
            id: 'acct-1',
            userProfileId: 'profile-auth-user-1',
            name: 'A',
            type: 'CHECKING',
            startingBalance: 0,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        }
        accounts.push(acc)

        // create two tx, one archived
        transactions.push({
            id: 't1',
            userProfileId: acc.userProfileId,
            type: 'EXPENSE',
            amount: 5,
            date: '2026-06-01',
            accountId: acc.id,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        transactions.push({
            id: 't2',
            userProfileId: acc.userProfileId,
            type: 'EXPENSE',
            amount: 7,
            date: '2026-06-02',
            accountId: acc.id,
            isArchived: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res1 = await app.request('/api/v1/transactions', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res1.status).toBe(200)
        const body1 = (await res1.json()) as any
        expect(body1.data).toHaveLength(1)

        const res2 = await app.request('/api/v1/transactions?includeArchived=true', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res2.status).toBe(200)
        const body2 = (await res2.json()) as any
        expect(body2.data).toHaveLength(2)
    })

    it('Filtering by type and accountId works and pagination meta returned', async () => {
        const acc = {
            id: 'acct-p',
            userProfileId: 'profile-auth-user-1',
            name: 'A',
            type: 'CHECKING',
            startingBalance: 0,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        }
        accounts.push(acc)
        // create multiple
        for (let i = 0; i < 30; i++)
            transactions.push({
                id: `tp-${i}`,
                userProfileId: acc.userProfileId,
                type: i % 2 === 0 ? 'INCOME' : 'EXPENSE',
                amount: 10,
                date: `2026-06-${String(30 - i).padStart(2, '0')}`,
                accountId: acc.id,
                isArchived: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            })

        const res = await app.request(
            '/api/v1/transactions?type=INCOME&page=2&pageSize=5&accountId=' + acc.id,
            { headers: authHeader(TOKEN_USER_1) },
        )
        expect(res.status).toBe(200)
        const body = (await res.json()) as any
        expect(body.data.length).toBe(5)
        expect(body.meta).toBeDefined()
        expect(body.meta.page).toBe(2)
    })

    it('Archive (DELETE) sets isArchived true and excluded from balance', async () => {
        const acc = {
            id: 'acct-b',
            userProfileId: 'profile-auth-user-1',
            name: 'A',
            type: 'CHECKING',
            startingBalance: 100,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        }
        accounts.push(acc)
        const tx = {
            id: 'bal-1',
            userProfileId: acc.userProfileId,
            type: 'EXPENSE',
            amount: 50,
            date: '2026-06-01',
            accountId: acc.id,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
        transactions.push(tx)

        const del = await app.request('/api/v1/transactions/' + tx.id, {
            method: 'DELETE',
            headers: authHeader(TOKEN_USER_1),
        })
        expect(del.status).toBe(200)

        const list = await app.request('/api/v1/transactions', {
            headers: authHeader(TOKEN_USER_1),
        })
        const listBody = (await list.json()) as any
        expect(listBody.data.find((t: any) => t.id === tx.id)).toBeUndefined()

        // Check aggregate: balance should equal startingBalance (expense archived excluded)
        const accRes = await app.request('/api/v1/accounts/' + acc.id, {
            headers: authHeader(TOKEN_USER_1),
        })
        const accBody = (await accRes.json()) as any
        expect(accBody.data.currentBalance).toBe(100)
    })
})
