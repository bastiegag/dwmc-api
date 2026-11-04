import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'
import { prisma } from '../db/prisma.js'
import type { AppError } from '../shared/errors/AppError.js'
import { getMonthlySummary } from '../modules/summary/summary.service.js'
import { createAccount, getAccountById } from '../modules/accounts/account.service.js'
import { createBudget, listBudgets } from '../modules/budgets/budget.service.js'
import { createCategory } from '../modules/categories/category.service.js'
import { createSection } from '../modules/sections/section.service.js'
import {
    archiveTransaction,
    createTransaction,
} from '../modules/transactions/transaction.service.js'
import type { AuthUser } from '../types/app.js'

const userOne: AuthUser = { id: 'integration-user-1', email: 'one@example.com' }
const userTwo: AuthUser = { id: 'integration-user-2', email: 'two@example.com' }

const clearDatabase = async () => {
    await prisma.$transaction([
        prisma.transaction.deleteMany(),
        prisma.budget.deleteMany(),
        prisma.category.deleteMany(),
        prisma.section.deleteMany(),
        prisma.account.deleteMany(),
        prisma.userProfile.deleteMany(),
    ])
}

describe('PostgreSQL persistence and domain integration', () => {
    beforeAll(async () => {
        const databaseUrl = process.env['DATABASE_URL'] ?? ''
        if (!databaseUrl.includes('_test')) {
            throw new Error(
                'Integration tests require a dedicated DATABASE_URL containing "_test".',
            )
        }
        await prisma.$queryRaw`SELECT 1`
    })

    beforeEach(clearDatabase)

    afterAll(async () => {
        await clearDatabase()
        await prisma.$disconnect()
    })

    it('keeps profiles and their resources isolated', async () => {
        const accountOne = await createAccount(userOne, {
            name: 'One account',
            color: '#000000',
            icon: 'wallet',
        })
        const accountTwo = await createAccount(userTwo, {
            name: 'Two account',
            color: '#ffffff',
            icon: 'wallet',
        })

        const profileOne = await prisma.userProfile.findUnique({
            where: { authUserId: userOne.id },
            include: { accounts: true },
        })
        const profileTwo = await prisma.userProfile.findUnique({
            where: { authUserId: userTwo.id },
            include: { accounts: true },
        })

        expect(profileOne?.accounts.map(({ id }) => id)).toEqual([accountOne.id])
        expect(profileTwo?.accounts.map(({ id }) => id)).toEqual([accountTwo.id])
        expect(
            await prisma.account.findFirst({
                where: { id: accountTwo.id, userProfileId: profileOne?.id },
            }),
        ).toBeNull()
    })

    it('rejects cross-user transaction references before persistence', async () => {
        const accountOne = await createAccount(userOne, {
            name: 'One account',
            color: '#000000',
            icon: 'wallet',
        })
        const accountTwo = await createAccount(userTwo, {
            name: 'Two account',
            color: '#ffffff',
            icon: 'wallet',
        })

        await expect(
            createTransaction(userOne, {
                type: 'TRANSFER',
                amount: 10,
                date: '2026-11-01',
                fromAccountId: accountOne.id,
                toAccountId: accountTwo.id,
                note: null,
            }),
        ).rejects.toMatchObject({ statusCode: 404 } satisfies Partial<AppError>)
        expect(await prisma.transaction.count()).toBe(0)
    })

    it('preserves cents, balances, archive behavior, and month boundaries', async () => {
        const account = await createAccount(userOne, {
            name: 'Checking',
            startingBalance: 100.1,
            color: '#000000',
            icon: 'wallet',
        })
        await createTransaction(userOne, {
            type: 'INCOME',
            amount: 0.2,
            date: '2026-11-01',
            accountId: account.id,
            note: null,
        })
        const archived = await createTransaction(userOne, {
            type: 'EXPENSE',
            amount: 50,
            date: '2026-11-15',
            accountId: account.id,
            categoryId: null,
            merchant: null,
            note: null,
        })
        await archiveTransaction(userOne, archived.id)
        await createTransaction(userOne, {
            type: 'ADJUSTMENT',
            amount: -0.3,
            date: '2026-11-30',
            accountId: account.id,
            note: null,
        })
        await createTransaction(userOne, {
            type: 'INCOME',
            amount: 25,
            date: '2026-12-01',
            accountId: account.id,
            note: null,
        })

        const summary = await getMonthlySummary(userOne, { month: '2026-11', recentLimit: 10 })
        expect(summary.totals.incomeTotal).toBe(0.2)
        expect(summary.totals.expenseTotal).toBe(0)
        expect(summary.recentTransactions).toHaveLength(2)
        expect((await getAccountById(userOne, account.id)).currentBalance).toBe(125)

        const stored = await prisma.transaction.findMany({
            where: { userProfile: { authUserId: userOne.id } },
            orderBy: { date: 'asc' },
        })
        expect(stored.map((transaction) => transaction.amount.toString())).toEqual([
            '0.2',
            '50',
            '-0.3',
            '25',
        ])
    })

    it('keeps budget totals scoped to active expenses and categories', async () => {
        const section = await createSection(userOne, { name: 'Needs', color: '#000000' })
        const category = await createCategory(userOne, {
            name: 'Groceries',
            icon: 'cart',
            sectionId: section.id,
        })
        const account = await createAccount(userOne, {
            name: 'Checking',
            color: '#000000',
            icon: 'wallet',
        })
        await createBudget(userOne, { categoryId: category.id, month: '2026-11', amount: 100.1 })
        await createTransaction(userOne, {
            type: 'EXPENSE',
            amount: 10.1,
            date: '2026-11-30',
            accountId: account.id,
            categoryId: category.id,
            merchant: null,
            note: null,
        })

        const budgets = await listBudgets(userOne, { month: '2026-11', includeArchived: false })
        expect(budgets[0]).toMatchObject({
            amount: 100.1,
            spent: 10.1,
            remaining: 90,
            transactionCount: 1,
        })
    })
})
