/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../app.js'
import { prisma } from '../db/prisma.js'
import { supabase } from '../lib/supabase.js'

type SuccessBody<T> = { data: T }

vi.mock('../lib/supabase.js', () => ({
    supabase: { auth: { getUser: vi.fn() } },
}))

vi.mock('../db/prisma.js', () => ({
    prisma: {
        userProfile: { upsert: vi.fn() },
        transaction: { findMany: vi.fn() },
    },
}))

const BEARER = 'Bearer '
const TOKEN_USER_1 = 'token-user-1'
const TOKEN_USER_2 = 'token-user-2'

const profilesByAuthUserId = new Map<string, any>()
let transactions: any[] = []

function authHeader(token: string) {
    return { Authorization: `${BEARER}${token}` }
}

function clone<T>(v: T) {
    return JSON.parse(JSON.stringify(v)) as T
}

function configureSupabaseMock() {
    ;(supabase.auth.getUser as any).mockImplementation(async (token: string) => {
        if (token === TOKEN_USER_1)
            return { data: { user: { id: 'auth-user-1', email: 'u1@example.com' } }, error: null }
        if (token === TOKEN_USER_2)
            return { data: { user: { id: 'auth-user-2', email: 'u2@example.com' } }, error: null }
        return { data: { user: null }, error: { message: 'Invalid' } }
    })
}

function configurePrismaMock() {
    ;(prisma.userProfile.upsert as any).mockImplementation(async ({ where, create }: any) => {
        const existing = profilesByAuthUserId.get(where.authUserId)
        if (existing) return clone(existing)
        const p = {
            id: `profile-${where.authUserId}`,
            authUserId: create.authUserId,
            email: create.email ?? null,
        }
        profilesByAuthUserId.set(where.authUserId, p)
        return clone(p)
    })
    ;(prisma.transaction.findMany as any).mockImplementation(async ({ where, take }: any) => {
        let list = transactions.filter((t) => t.userProfileId === where.userProfileId)
        if (where.isArchived !== undefined)
            list = list.filter((t) => t.isArchived === where.isArchived)
        if (where.date) {
            const gte = where.date.gte
            const lt = where.date.lt
            list = list.filter(
                (t) => new Date(t.date) >= new Date(gte) && new Date(t.date) < new Date(lt),
            )
        }
        // order desc by date
        list = list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        if (take) list = list.slice(0, take)
        return clone(list)
    })
}

beforeEach(() => {
    vi.clearAllMocks()
    profilesByAuthUserId.clear()
    transactions = []
    configureSupabaseMock()
    configurePrismaMock()
})

describe('Monthly Summary API', () => {
    it('GET /api/v1/summary/monthly without token returns 401', async () => {
        const res = await app.request('/api/v1/summary/monthly')
        expect(res.status).toBe(401)
    })

    it('GET /api/v1/summary/monthly with invalid month returns 422', async () => {
        const res = await app.request('/api/v1/summary/monthly?month=invalid', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res.status).toBe(422)
    })

    it('Defaults to current month when month not provided', async () => {
        // create a transaction for current month
        const now = new Date()
        const iso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 5)).toISOString()
        transactions.push({
            id: 't1',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 10,
            date: iso,
            accountId: 'a1',
            categoryId: null,
            isArchived: false,
            account: { id: 'a1', name: 'A', color: '#000', icon: 'i' },
        })

        const res = await app.request('/api/v1/summary/monthly', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res.status).toBe(200)
        const body = (await res.json()) as SuccessBody<any>
        expect(body.data).toBeDefined()
        expect(body.data.totals.transactionCount).toBe(1)
    })

    it('Summary excludes archived transactions', async () => {
        const iso = '2026-06-05T00:00:00.000Z'
        transactions.push({
            id: 't1',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 10,
            date: iso,
            accountId: 'a1',
            categoryId: null,
            isArchived: true,
        })
        transactions.push({
            id: 't2',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 20,
            date: iso,
            accountId: 'a1',
            categoryId: null,
            isArchived: false,
        })

        const res = await app.request('/api/v1/summary/monthly?month=2026-06', {
            headers: authHeader(TOKEN_USER_1),
        })
        const body = (await res.json()) as SuccessBody<any>
        expect(body.data.totals.transactionCount).toBe(1)
        expect(body.data.totals.expenseTotal).toBe(20)
    })

    it('Calculates income, expense, adjustment, transfer and net totals correctly', async () => {
        const iso = '2026-06-10T00:00:00.000Z'
        transactions.push({
            id: 'i1',
            userProfileId: 'profile-auth-user-1',
            type: 'INCOME',
            amount: 500,
            date: iso,
            accountId: 'a1',
            categoryId: 'c1',
            isArchived: false,
            category: {
                id: 'c1',
                name: 'Salary',
                icon: 's',
                section: { id: 'sec1', name: 'Income', color: '#fff' },
            },
            account: { id: 'a1', name: 'Checking', color: '#000', icon: 'w' },
        })
        transactions.push({
            id: 'e1',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 200,
            date: iso,
            accountId: 'a1',
            categoryId: 'c2',
            isArchived: false,
            category: {
                id: 'c2',
                name: 'Groceries',
                icon: 'g',
                section: { id: 'sec2', name: 'Food', color: '#0f0' },
            },
        })
        transactions.push({
            id: 'a1',
            userProfileId: 'profile-auth-user-1',
            type: 'ADJUSTMENT',
            amount: 50,
            date: iso,
            accountId: 'a1',
            isArchived: false,
        })
        transactions.push({
            id: 't1',
            userProfileId: 'profile-auth-user-1',
            type: 'TRANSFER',
            amount: 100,
            date: iso,
            fromAccountId: 'a1',
            toAccountId: 'a2',
            isArchived: false,
            fromAccount: { id: 'a1', name: 'A1' },
            toAccount: { id: 'a2', name: 'A2' },
        })

        const res = await app.request('/api/v1/summary/monthly?month=2026-06&recentLimit=3', {
            headers: authHeader(TOKEN_USER_1),
        })
        const body = (await res.json()) as SuccessBody<any>
        expect(body.data.totals.incomeTotal).toBe(500)
        expect(body.data.totals.expenseTotal).toBe(200)
        expect(body.data.totals.adjustmentTotal).toBe(50)
        expect(body.data.totals.transferTotal).toBe(100)
        expect(body.data.totals.netTotal).toBe(350) // 500 - 200 + 50
        expect(body.data.recentTransactions.length).toBe(3)
    })

    it('Top categories calculated and percentages avoid division by zero', async () => {
        const iso = '2026-06-12T00:00:00.000Z'
        transactions.push({
            id: 'e1',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 0,
            date: iso,
            accountId: 'a1',
            categoryId: 'c1',
            isArchived: false,
            category: {
                id: 'c1',
                name: 'Foo',
                icon: 'i',
                section: { id: 's1', name: 'S', color: '#000' },
            },
        })
        // expense total is 0
        const res = await app.request('/api/v1/summary/monthly?month=2026-06', {
            headers: authHeader(TOKEN_USER_1),
        })
        const body = (await res.json()) as SuccessBody<any>
        expect(Array.isArray(body.data.topExpenseCategories)).toBe(true)
        // percentage when total zero should be 0
        if (body.data.topExpenseCategories.length)
            expect(body.data.topExpenseCategories[0].percentage).toBe(0)
    })

    it('Does not include another user transactions', async () => {
        const iso = '2026-06-05T00:00:00.000Z'
        transactions.push({
            id: 'u1',
            userProfileId: 'profile-auth-user-2',
            type: 'EXPENSE',
            amount: 999,
            date: iso,
            accountId: 'a1',
            categoryId: null,
            isArchived: false,
        })
        transactions.push({
            id: 'u2',
            userProfileId: 'profile-auth-user-1',
            type: 'EXPENSE',
            amount: 10,
            date: iso,
            accountId: 'a1',
            categoryId: null,
            isArchived: false,
        })

        const res = await app.request('/api/v1/summary/monthly?month=2026-06', {
            headers: authHeader(TOKEN_USER_1),
        })
        const body = (await res.json()) as SuccessBody<any>
        expect(body.data.totals.transactionCount).toBe(1)
        expect(body.data.totals.expenseTotal).toBe(10)
    })
})
