/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, beforeEach, expect, vi } from 'vitest'
import { app } from '../app.js'
import { prisma } from '../db/prisma.js'
import { supabase } from '../lib/supabase.js'

vi.mock('../lib/supabase.js', () => ({
    supabase: { auth: { getUser: vi.fn() } },
}))

vi.mock('../db/prisma.js', () => ({
    prisma: {
        $queryRaw: vi.fn(),
        userProfile: { upsert: vi.fn() },
        category: { findFirst: vi.fn() },
        budget: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
        transaction: { groupBy: vi.fn() },
    },
}))

const BEARER = 'Bearer '
const TOKEN_USER_1 = 'token-user-1'
const TOKEN_USER_2 = 'token-user-2'

const profilesByAuthUserId = new Map<string, any>()
let categories: any[] = []
let budgets: any[] = []
let transactions: any[] = []
let budgetCounter = 1

function authHeader(token: string) {
    return { Authorization: `${BEARER}${token}` }
}

function clone(v: any) {
    return JSON.parse(JSON.stringify(v))
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

function configurePrismaMocks() {
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
    ;(prisma.category.findFirst as any).mockImplementation(async ({ where }: any) => {
        return clone(
            categories.find((c) => c.id === where.id && c.userProfileId === where.userProfileId) ??
                null,
        )
    })
    ;(prisma.budget.findMany as any).mockImplementation(async ({ where }: any) => {
        let result = budgets.filter((b) => b.userProfileId === where.userProfileId)
        if (where.month) result = result.filter((b) => b.month === where.month)
        if (where.categoryId) result = result.filter((b) => b.categoryId === where.categoryId)
        if (where.isArchived !== undefined)
            result = result.filter((b) => b.isArchived === where.isArchived)
        return clone(
            result.map((b) => ({
                ...b,
                category: categories.find((c) => c.id === b.categoryId) ?? null,
            })),
        )
    })
    ;(prisma.budget.findFirst as any).mockImplementation(async ({ where }: any) => {
        if (where.id && where.userProfileId) {
            const b = budgets.find(
                (x) => x.id === where.id && x.userProfileId === where.userProfileId,
            )
            return clone(
                b
                    ? { ...b, category: categories.find((c) => c.id === b.categoryId) ?? null }
                    : null,
            )
        }
        const b = budgets.find(
            (x) =>
                x.userProfileId === where.userProfileId &&
                x.categoryId === where.categoryId &&
                x.month === where.month,
        )
        return clone(b ?? null)
    })
    ;(prisma.budget.create as any).mockImplementation(async ({ data }: any) => {
        const id = `budget-${budgetCounter++}`
        const b = { id, ...data, createdAt: new Date(), updatedAt: new Date() }
        budgets.push(b)
        return clone({ ...b, category: categories.find((c) => c.id === b.categoryId) ?? null })
    })
    ;(prisma.budget.update as any).mockImplementation(async ({ where, data }: any) => {
        const idx = budgets.findIndex(
            (b) => b.id === where.id && b.userProfileId === where.userProfileId,
        )
        if (idx < 0) throw new Error('Not found')
        const current = budgets[idx]
        const next = { ...current, ...(data as any), updatedAt: new Date() }
        budgets[idx] = next
        return clone({
            ...next,
            category: categories.find((c) => c.id === next.categoryId) ?? null,
        })
    })
    ;(prisma.transaction.groupBy as any).mockImplementation(async ({ where }: any) => {
        let list = transactions.filter(
            (t) => t.userProfileId === where.userProfileId && !t.isArchived,
        )
        if (where.type) list = list.filter((t) => t.type === where.type)
        if (where.date) {
            const gte = where.date.gte
            const lt = where.date.lt
            if (gte) list = list.filter((t) => new Date(t.date) >= new Date(gte))
            if (lt) list = list.filter((t) => new Date(t.date) < new Date(lt))
        }
        list = list.filter((t) => t.categoryId)
        const grouped: any = {}
        for (const t of list) {
            const key = t.categoryId
            if (!grouped[key]) grouped[key] = { sum: 0, count: 0 }
            grouped[key].sum += Number(t.amount)
            grouped[key].count += 1
        }
        return Object.keys(grouped).map((k) => ({
            categoryId: k,
            _sum: { amount: grouped[k].sum },
            _count: { id: grouped[k].count },
        }))
    })
}

describe('Budgets API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        profilesByAuthUserId.clear()
        categories = []
        budgets = []
        transactions = []
        budgetCounter = 1

        configureSupabaseMock()
        configurePrismaMocks()
    })

    it('GET /api/v1/budgets without token returns 401', async () => {
        const res = await app.request('http://localhost/api/v1/budgets')
        expect(res.status).toBe(401)
    })

    it('POST /api/v1/budgets without token returns 401', async () => {
        const res = await app.request('http://localhost/api/v1/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId: 'c1', month: '2026-06', amount: 100 }),
        })
        expect(res.status).toBe(401)
    })

    it('Creating a budget validates required fields', async () => {
        const res = await app.request('http://localhost/api/v1/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader(TOKEN_USER_1) },
            body: JSON.stringify({ month: '2026-06', amount: 100 }),
        })
        expect(res.status).toBe(422)
    })

    it('Creating a budget validates month format', async () => {
        const res = await app.request('http://localhost/api/v1/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader(TOKEN_USER_1) },
            body: JSON.stringify({ categoryId: 'c1', month: '06-2026', amount: 100 }),
        })
        expect(res.status).toBe(422)
    })

    it('Creating a budget rejects negative amount', async () => {
        const res = await app.request('http://localhost/api/v1/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader(TOKEN_USER_1) },
            body: JSON.stringify({ categoryId: 'c1', month: '2026-06', amount: -10 }),
        })
        expect(res.status).toBe(422)
    })

    it('Creating a budget validates category ownership', async () => {
        const res = await app.request('http://localhost/api/v1/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader(TOKEN_USER_1) },
            body: JSON.stringify({ categoryId: 'nonexistent', month: '2026-06', amount: 100 }),
        })
        expect(res.status).toBe(404)
    })

    it('Creating a duplicate budget for the same category and month returns 409', async () => {
        categories.push({
            id: 'cat1',
            userProfileId: 'profile-auth-user-1',
            name: 'Groceries',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'Food', color: '#000' },
        })
        budgets.push({
            id: 'b1',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat1',
            month: '2026-06',
            amount: 200,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request('http://localhost/api/v1/budgets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader(TOKEN_USER_1) },
            body: JSON.stringify({ categoryId: 'cat1', month: '2026-06', amount: 100 }),
        })
        expect(res.status).toBe(409)
    })

    it('Listing budgets only returns budgets for the authenticated user', async () => {
        categories.push({
            id: 'catA',
            userProfileId: 'profile-auth-user-1',
            name: 'A',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        categories.push({
            id: 'catB',
            userProfileId: 'profile-auth-user-2',
            name: 'B',
            icon: 'i',
            sectionId: 's2',
            section: { id: 's2', name: 'Two', color: '#222' },
        })
        budgets.push({
            id: 'b1',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'catA',
            month: '2026-06',
            amount: 100,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        budgets.push({
            id: 'b2',
            userProfileId: 'profile-auth-user-2',
            categoryId: 'catB',
            month: '2026-06',
            amount: 300,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request('http://localhost/api/v1/budgets?month=2026-06', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res.status).toBe(200)
        const body = (await res.json()) as any
        expect(body.data.length).toBe(1)
        expect(body.data[0].category.id).toBe('catA')
    })

    it('Listing budgets defaults to the current month when month is not provided', async () => {
        const now = new Date()
        const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
        categories.push({
            id: 'c2',
            userProfileId: 'profile-auth-user-1',
            name: 'X',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        budgets.push({
            id: 'bcur',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'c2',
            month,
            amount: 50,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request('http://localhost/api/v1/budgets', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res.status).toBe(200)
        const body = (await res.json()) as any
        expect(body.data.some((b: any) => b.id === 'bcur')).toBe(true)
    })

    it('Listing budgets filters by categoryId', async () => {
        categories.push({
            id: 'c3',
            userProfileId: 'profile-auth-user-1',
            name: 'Y',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        budgets.push({
            id: 'b3',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'c3',
            month: '2026-06',
            amount: 75,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request(
            'http://localhost/api/v1/budgets?month=2026-06&categoryId=c3',
            { headers: authHeader(TOKEN_USER_1) },
        )
        expect(res.status).toBe(200)
        const body = (await res.json()) as any
        expect(body.data.length).toBe(1)
        expect(body.data[0].category.id).toBe('c3')
    })

    it('Listing budgets excludes archived budgets by default and includeArchived=true includes them', async () => {
        categories.push({
            id: 'c4',
            userProfileId: 'profile-auth-user-1',
            name: 'Z',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        budgets.push({
            id: 'b4',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'c4',
            month: '2026-06',
            amount: 10,
            isArchived: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res1 = await app.request('http://localhost/api/v1/budgets?month=2026-06', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res1.status).toBe(200)
        const body1 = (await res1.json()) as any
        expect(body1.data.find((b: any) => b.id === 'b4')).toBeUndefined()

        const res2 = await app.request(
            'http://localhost/api/v1/budgets?month=2026-06&includeArchived=true',
            { headers: authHeader(TOKEN_USER_1) },
        )
        expect(res2.status).toBe(200)
        const body2 = (await res2.json()) as any
        expect(body2.data.find((b: any) => b.id === 'b4')).toBeDefined()
    })

    it("GET /api/v1/budgets/:id returns 404 for another user's budget", async () => {
        budgets.push({
            id: 'bX',
            userProfileId: 'profile-auth-user-2',
            categoryId: 'cX',
            month: '2026-06',
            amount: 20,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        const res = await app.request('http://localhost/api/v1/budgets/bX', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res.status).toBe(404)
    })

    it('PATCH /api/v1/budgets/:id updates only the authenticated user budget', async () => {
        categories.push({
            id: 'c5',
            userProfileId: 'profile-auth-user-1',
            name: 'P',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        budgets.push({
            id: 'b5',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'c5',
            month: '2026-06',
            amount: 100,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request('http://localhost/api/v1/budgets/b5', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeader(TOKEN_USER_1) },
            body: JSON.stringify({ amount: 150 }),
        })
        expect(res.status).toBe(200)
        const body = (await res.json()) as any
        expect(body.data.amount).toBe(150)
    })

    it('PATCH validates category ownership when changing categoryId', async () => {
        categories.push({
            id: 'c6',
            userProfileId: 'profile-auth-user-1',
            name: 'Q',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        categories.push({
            id: 'c7',
            userProfileId: 'profile-auth-user-2',
            name: 'R',
            icon: 'i',
            sectionId: 's2',
            section: { id: 's2', name: 'Two', color: '#222' },
        })
        budgets.push({
            id: 'b6',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'c6',
            month: '2026-06',
            amount: 50,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request('http://localhost/api/v1/budgets/b6', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeader(TOKEN_USER_1) },
            body: JSON.stringify({ categoryId: 'c7' }),
        })
        expect(res.status).toBe(404)
    })

    it('PATCH prevents duplicate budget when changing categoryId or month', async () => {
        categories.push({
            id: 'c8',
            userProfileId: 'profile-auth-user-1',
            name: 'S',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        budgets.push({
            id: 'b7',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'c8',
            month: '2026-06',
            amount: 20,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        budgets.push({
            id: 'b8',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'c9',
            month: '2026-07',
            amount: 30,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request('http://localhost/api/v1/budgets/b8', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeader(TOKEN_USER_1) },
            body: JSON.stringify({ categoryId: 'c8', month: '2026-06' }),
        })
        expect(res.status).toBe(409)
    })

    it('DELETE /api/v1/budgets/:id soft deletes by setting isArchived to true', async () => {
        categories.push({
            id: 'c10',
            userProfileId: 'profile-auth-user-1',
            name: 'T',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        budgets.push({
            id: 'b9',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'c10',
            month: '2026-06',
            amount: 200,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        const res = await app.request('http://localhost/api/v1/budgets/b9', {
            method: 'DELETE',
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res.status).toBe(200)
        const body = (await res.json()) as any
        expect(body.data.isArchived).toBe(true)
    })

    it('spent is calculated from EXPENSE transactions only and excludes archived/other-user/other-types', async () => {
        categories.push({
            id: 'cat-exp',
            userProfileId: 'profile-auth-user-1',
            name: 'Exp',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        budgets.push({
            id: 'b-exp',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-exp',
            month: '2026-06',
            amount: 500,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        transactions.push({
            id: 't1',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-exp',
            type: 'EXPENSE',
            amount: 100,
            date: new Date(Date.UTC(2026, 5, 5)).toISOString(),
            isArchived: false,
        })
        transactions.push({
            id: 't2',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-exp',
            type: 'EXPENSE',
            amount: 150,
            date: new Date(Date.UTC(2026, 5, 10)).toISOString(),
            isArchived: false,
        })
        transactions.push({
            id: 't3',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-exp',
            type: 'EXPENSE',
            amount: 50,
            date: new Date(Date.UTC(2026, 5, 20)).toISOString(),
            isArchived: false,
        })
        transactions.push({
            id: 't4',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-exp',
            type: 'EXPENSE',
            amount: 999,
            date: new Date(Date.UTC(2026, 5, 21)).toISOString(),
            isArchived: true,
        })
        transactions.push({
            id: 't5',
            userProfileId: 'profile-auth-user-2',
            categoryId: 'cat-exp',
            type: 'EXPENSE',
            amount: 200,
            date: new Date(Date.UTC(2026, 5, 15)).toISOString(),
            isArchived: false,
        })
        transactions.push({
            id: 't6',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-exp',
            type: 'INCOME',
            amount: 1000,
            date: new Date(Date.UTC(2026, 5, 12)).toISOString(),
            isArchived: false,
        })
        transactions.push({
            id: 't7',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-exp',
            type: 'TRANSFER',
            amount: 100,
            date: new Date(Date.UTC(2026, 5, 13)).toISOString(),
            isArchived: false,
        })
        transactions.push({
            id: 't8',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-exp',
            type: 'ADJUSTMENT',
            amount: 20,
            date: new Date(Date.UTC(2026, 5, 14)).toISOString(),
            isArchived: false,
        })

        const res = await app.request('http://localhost/api/v1/budgets?month=2026-06', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res.status).toBe(200)
        const body = (await res.json()) as any
        const b = body.data.find((x: any) => x.id === 'b-exp')
        expect(b.spent).toBe(300)
        expect(b.transactionCount).toBe(3)
        expect(b.remaining).toBe(200)
        expect(b.isOverBudget).toBe(false)
    })

    it('progress handles amount 0 safely and isOverBudget true when spent > amount', async () => {
        categories.push({
            id: 'cat-zero',
            userProfileId: 'profile-auth-user-1',
            name: 'Zero',
            icon: 'i',
            sectionId: 's1',
            section: { id: 's1', name: 'One', color: '#111' },
        })
        budgets.push({
            id: 'b-zero',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-zero',
            month: '2026-06',
            amount: 0,
            isArchived: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        })

        transactions.push({
            id: 'tz1',
            userProfileId: 'profile-auth-user-1',
            categoryId: 'cat-zero',
            type: 'EXPENSE',
            amount: 10,
            date: new Date(Date.UTC(2026, 5, 2)).toISOString(),
            isArchived: false,
        })

        const res = await app.request('http://localhost/api/v1/budgets?month=2026-06', {
            headers: authHeader(TOKEN_USER_1),
        })
        expect(res.status).toBe(200)
        const body = (await res.json()) as any
        const b = body.data.find((x: any) => x.id === 'b-zero')
        expect(b.spent).toBe(10)
        expect(b.progress).toBe(100)
        expect(b.isOverBudget).toBe(true)
    })
})
