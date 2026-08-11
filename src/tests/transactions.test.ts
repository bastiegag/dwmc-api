/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../app.js'
import { prisma } from '../db/prisma.js'
import { supabase } from '../lib/supabase.js'
import {
    TEST_AUTH_USER_1,
    TEST_AUTH_USER_2,
    authHeader,
    clone,
    createSupabaseGetUserMock,
} from './test-utils.js'

type SuccessBody<T> = { data: T }
type MetaBody<T> = {
    data: T
    meta: { page: number; pageSize: number; total: number; totalPages: number }
}
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
            groupBy: vi.fn(),
        },
    },
}))

const TOKEN_USER_1 = TEST_AUTH_USER_1.token
const TOKEN_USER_2 = TEST_AUTH_USER_2.token

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

const expectTransactionEnvelope = (body: SuccessBody<any>) => {
    expect(Object.keys(body).sort()).toEqual(['data'])
    expect(new Set(Object.keys(body.data))).toEqual(
        new Set([
            'account',
            'accountId',
            'amount',
            'createdAt',
            'category',
            'categoryId',
            'date',
            'fromAccount',
            'fromAccountId',
            'id',
            'isArchived',
            'merchant',
            'note',
            'toAccount',
            'toAccountId',
            'type',
            'updatedAt',
        ]),
    )
    expect(body.data).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        amount: expect.any(Number),
        date: expect.any(String),
        isArchived: expect.any(Boolean),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
    })
    expect(body.data).toHaveProperty('merchant')
    expect(body.data).toHaveProperty('note')
    expect(body.data).toHaveProperty('accountId')
    expect(body.data).toHaveProperty('fromAccountId')
    expect(body.data).toHaveProperty('toAccountId')
    expect(body.data).toHaveProperty('categoryId')
    expect(body.data).toHaveProperty('account')
    expect(body.data).toHaveProperty('fromAccount')
    expect(body.data).toHaveProperty('toAccount')
    expect(body.data).toHaveProperty('category')
}

const expectTransactionListEnvelope = (body: MetaBody<any[]>) => {
    expect(Object.keys(body).sort()).toEqual(['data', 'meta'])
    expect(body.meta).toEqual(
        expect.objectContaining({
            page: expect.any(Number),
            pageSize: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number),
        }),
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
        if (where.date?.gte)
            result = result.filter((t) => new Date(t.date) >= new Date(where.date.gte))
        if (where.date?.lte)
            result = result.filter((t) => new Date(t.date) <= new Date(where.date.lte))
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
                (where.categoryId ? t.categoryId === where.categoryId : true) &&
                (where.date?.gte ? new Date(t.date) >= new Date(where.date.gte) : true) &&
                (where.date?.lte ? new Date(t.date) <= new Date(where.date.lte) : true),
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
    ;(prisma.transaction.groupBy as any).mockImplementation(async ({ where }: any) => {
        const filtered = transactions.filter((t) => {
            if (t.userProfileId !== where.userProfileId || t.isArchived !== false) return false
            return where.OR?.some(
                (condition: any) =>
                    (condition.accountId?.in && condition.accountId.in.includes(t.accountId)) ||
                    (condition.fromAccountId?.in &&
                        condition.fromAccountId.in.includes(t.fromAccountId)) ||
                    (condition.toAccountId?.in && condition.toAccountId.in.includes(t.toAccountId)),
            )
        })
        const grouped = new Map<string, any>()
        for (const t of filtered) {
            const key = [t.type, t.accountId, t.fromAccountId, t.toAccountId].join('|')
            const existing = grouped.get(key)
            if (existing) {
                existing._sum.amount += Number(t.amount)
                continue
            }
            grouped.set(key, {
                type: t.type,
                accountId: t.accountId ?? null,
                fromAccountId: t.fromAccountId ?? null,
                toAccountId: t.toAccountId ?? null,
                _sum: { amount: Number(t.amount) },
            })
        }
        return [...grouped.values()]
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
        expectTransactionEnvelope(body)
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

    it('Creating a transaction rejects archived accounts', async () => {
        accounts.push({
            id: 'archived-account',
            userProfileId: 'profile-auth-user-1',
            name: 'Archived',
            type: 'CHECKING',
            startingBalance: 0,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: true,
        })

        const res = await app.request('/api/v1/transactions', {
            method: 'POST',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'EXPENSE',
                amount: 10,
                date: '2026-06-01',
                accountId: 'archived-account',
            }),
        })

        expect(res.status).toBe(422)
    })

    it('Updating a transfer to an account transaction requires an account', async () => {
        transactions.push({
            id: 'transfer-to-expense',
            userProfileId: 'profile-auth-user-1',
            type: 'TRANSFER',
            amount: 10,
            date: '2026-06-01',
            fromAccountId: 'from-account',
            toAccountId: 'to-account',
            accountId: null,
            categoryId: null,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request('/api/v1/transactions/transfer-to-expense', {
            method: 'PATCH',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'EXPENSE' }),
        })

        expect(res.status).toBe(422)
    })

    it('Updates an expense amount and recalculates the account balance', async () => {
        accounts.push({
            id: 'balance-account',
            userProfileId: 'profile-auth-user-1',
            name: 'Balance account',
            type: 'CHECKING',
            startingBalance: 100,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        })
        transactions.push({
            id: 'amount-edit',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 20,
            date: '2026-06-01',
            accountId: 'balance-account',
            categoryId: null,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const update = await app.request('/api/v1/transactions/amount-edit', {
            method: 'PATCH',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 50 }),
        })
        expect(update.status).toBe(200)

        const account = await app.request('/api/v1/accounts/balance-account', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(account.status).toBe(200)
        expect(((await account.json()) as any).data.currentBalance).toBe(50)
    })

    it('Moves an expense to another account and removes the old account effect', async () => {
        accounts.push(
            {
                id: 'old-account',
                userProfileId: 'profile-auth-user-1',
                name: 'Old account',
                type: 'CHECKING',
                startingBalance: 100,
                goal: null,
                color: '#000',
                icon: 'i',
                isArchived: false,
            },
            {
                id: 'new-account',
                userProfileId: 'profile-auth-user-1',
                name: 'New account',
                type: 'CHECKING',
                startingBalance: 200,
                goal: null,
                color: '#000',
                icon: 'i',
                isArchived: false,
            },
        )
        transactions.push({
            id: 'account-edit',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 30,
            date: '2026-06-01',
            accountId: 'old-account',
            categoryId: null,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const update = await app.request('/api/v1/transactions/account-edit', {
            method: 'PATCH',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: 'new-account' }),
        })
        expect(update.status).toBe(200)

        const [oldAccount, newAccount] = await Promise.all([
            app.request('/api/v1/accounts/old-account', { headers: authHeader(TOKEN_USER_1) }),
            app.request('/api/v1/accounts/new-account', { headers: authHeader(TOKEN_USER_1) }),
        ])
        expect(((await oldAccount.json()) as any).data.currentBalance).toBe(100)
        expect(((await newAccount.json()) as any).data.currentBalance).toBe(170)
    })

    it('Changes transaction type and normalizes its relations', async () => {
        accounts.push({
            id: 'type-account',
            userProfileId: 'profile-auth-user-1',
            name: 'Type account',
            type: 'CHECKING',
            startingBalance: 100,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        })
        transactions.push({
            id: 'type-edit',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 20,
            date: '2026-06-01',
            accountId: 'type-account',
            categoryId: 'category-1',
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const update = await app.request('/api/v1/transactions/type-edit', {
            method: 'PATCH',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'ADJUSTMENT', amount: -5 }),
        })
        expect(update.status).toBe(200)
        const body = (await update.json()) as any
        expect(body.data).toMatchObject({
            type: 'ADJUSTMENT',
            amount: -5,
            accountId: 'type-account',
            categoryId: null,
            fromAccountId: null,
            toAccountId: null,
        })

        const account = await app.request('/api/v1/accounts/type-account', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(((await account.json()) as any).data.currentBalance).toBe(95)
    })

    it('Changes transfer endpoints and recalculates both account balances', async () => {
        for (const [id, startingBalance] of [
            ['from-old', 100],
            ['to-old', 50],
            ['from-new', 200],
            ['to-new', 75],
        ] as const) {
            accounts.push({
                id,
                userProfileId: 'profile-auth-user-1',
                name: id,
                type: 'CHECKING',
                startingBalance,
                goal: null,
                color: '#000',
                icon: 'i',
                isArchived: false,
            })
        }
        transactions.push({
            id: 'transfer-edit',
            userProfileId: 'profile-auth-user-1',
            type: 'TRANSFER',
            amount: 25,
            date: '2026-06-01',
            accountId: null,
            fromAccountId: 'from-old',
            toAccountId: 'to-old',
            categoryId: null,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const update = await app.request('/api/v1/transactions/transfer-edit', {
            method: 'PATCH',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromAccountId: 'from-new', toAccountId: 'to-new' }),
        })
        expect(update.status).toBe(200)

        const responses = await Promise.all(
            ['from-old', 'to-old', 'from-new', 'to-new'].map((id) =>
                app.request(`/api/v1/accounts/${id}`, { headers: authHeader(TOKEN_USER_1) }),
            ),
        )
        const balances = await Promise.all(
            responses.map(async (response) => ((await response.json()) as any).data.currentBalance),
        )
        expect(balances).toEqual([100, 50, 175, 100])
    })

    it('Moves a transaction across months and removes its old-month list result', async () => {
        transactions.push({
            id: 'month-edit',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 12,
            date: '2026-05-31T00:00:00.000Z',
            accountId: 'account-1',
            categoryId: null,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const update = await app.request('/api/v1/transactions/month-edit', {
            method: 'PATCH',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: '2026-06-01' }),
        })
        expect(update.status).toBe(200)

        const [may, june] = await Promise.all([
            app.request('/api/v1/transactions?month=2026-05', {
                headers: authHeader(TOKEN_USER_1),
            }),
            app.request('/api/v1/transactions?month=2026-06', {
                headers: authHeader(TOKEN_USER_1),
            }),
        ])
        expect(((await may.json()) as any).meta.total).toBe(0)
        expect(((await june.json()) as any).meta.total).toBe(1)
    })

    it('Rejects invalid transaction calendar dates', async () => {
        const res = await app.request('/api/v1/transactions', {
            method: 'POST',
            headers: { ...authHeader(TOKEN_USER_1), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'ADJUSTMENT',
                amount: 1,
                date: '2026-02-30',
                accountId: 'account-1',
            }),
        })

        expect(res.status).toBe(422)
    })

    it('Rejects invalid transaction month filters', async () => {
        const res = await app.request('/api/v1/transactions?month=2026-13', {
            headers: authHeader(TOKEN_USER_1),
        })

        expect(res.status).toBe(422)
    })

    it('Rejects invalid transaction date filters', async () => {
        const res = await app.request('/api/v1/transactions?startDate=2026-02-30', {
            headers: authHeader(TOKEN_USER_1),
        })

        expect(res.status).toBe(422)
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
        const body1 = (await res1.json()) as MetaBody<any[]>
        expectTransactionListEnvelope(body1)
        expect(body1.data).toHaveLength(1)
        expect(body1.meta).toMatchObject({ page: 1, pageSize: 25, total: 1, totalPages: 1 })

        const res2 = await app.request('/api/v1/transactions?includeArchived=true', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res2.status).toBe(200)
        const body2 = (await res2.json()) as MetaBody<any[]>
        expectTransactionListEnvelope(body2)
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
        const body = (await res.json()) as MetaBody<any[]>
        expectTransactionListEnvelope(body)
        expect(body.data.length).toBe(5)
        expect(body.meta.page).toBe(2)
        expect(body.meta.pageSize).toBe(5)
        expect(body.meta.total).toBe(15)
        expect(body.meta.totalPages).toBe(3)
    })

    it('User-scoped reads do not leak another user transaction', async () => {
        const acc1 = {
            id: 'acct-u1',
            userProfileId: 'profile-auth-user-1',
            name: 'A1',
            type: 'CHECKING',
            startingBalance: 0,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        }
        const acc2 = {
            id: 'acct-u2',
            userProfileId: 'profile-auth-user-2',
            name: 'A2',
            type: 'CHECKING',
            startingBalance: 0,
            goal: null,
            color: '#000',
            icon: 'i',
            isArchived: false,
        }
        accounts.push(acc1, acc2)

        const createRes = await app.request('/api/v1/transactions', {
            method: 'POST',
            headers: { ...authHeader(TOKEN_USER_2), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'INCOME',
                amount: 12,
                date: '2026-06-03',
                accountId: acc2.id,
            }),
        })
        expect(createRes.status).toBe(201)
        const created = (await createRes.json()) as SuccessBody<any>

        const listRes = await app.request('/api/v1/transactions', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(listRes.status).toBe(200)
        const listBody = (await listRes.json()) as MetaBody<any[]>
        expect(listBody.data.find((tx) => tx.id === created.data.id)).toBeUndefined()

        const getRes = await app.request('/api/v1/transactions/' + created.data.id, {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(getRes.status).toBe(404)
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
