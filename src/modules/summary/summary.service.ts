import type { AuthUser } from '../../types/app.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import { serializeDecimal } from '../../shared/money/decimal.js'
import { AppError } from '../../shared/errors/AppError.js'
import { findTransactionsForMonth, findRecentTransactionsForMonth } from './summary.repository.js'
import type { Transaction } from '@prisma/client'

type Tx = Transaction & {
    account?: { id: string; name: string; color: string; icon: string; type?: string } | null
    fromAccount?: { id: string; name?: string; color?: string; icon?: string } | null
    toAccount?: { id: string; name?: string; color?: string; icon?: string } | null
    category?: {
        id: string
        name: string
        icon: string
        sectionId?: string
        section?: { id: string; name: string; color: string } | null
    } | null
}

type CategoryAgg = {
    total: number
    count: number
    name: string | null
    icon: string | null
    section: { id: string; name: string; color: string } | null
}

type AccountAgg = {
    accountId: string
    name: string | null
    type: string | null
    color: string | null
    icon: string | null
    incomeTotal: number
    expenseTotal: number
    adjustmentTotal: number
    transferInTotal: number
    transferOutTotal: number
    netTotal: number
    transactionCount: number
}

const toIso = (d: unknown) => {
    const hasIso = d && typeof (d as { toISOString?: unknown }).toISOString === 'function'
    return hasIso
        ? (d as { toISOString: () => string }).toISOString()
        : new Date(String(d)).toISOString()
}

export const getMonthlySummary = async (
    authUser: AuthUser,
    query: { month?: string; recentLimit?: number },
) => {
    const profile = await getOrCreateUserProfile(authUser)

    // Determine month range
    let y: number
    let m: number
    if (query.month) {
        const [yStr, mStr] = query.month.split('-')
        y = Number(yStr)
        m = Number(mStr)
    } else {
        const now = new Date()
        y = now.getUTCFullYear()
        m = now.getUTCMonth() + 1
    }

    const start = new Date(Date.UTC(y, m - 1, 1))
    const next = new Date(Date.UTC(y, m, 1))
    const startIso = start.toISOString()
    const nextIso = next.toISOString()

    try {
        const allTx = await findTransactionsForMonth(profile.id, startIso, nextIso)
        const recent = await findRecentTransactionsForMonth(
            profile.id,
            startIso,
            nextIso,
            Math.min(query.recentLimit ?? 5, 20),
        )

        // Totals
        let incomeTotal = 0
        let expenseTotal = 0
        let adjustmentTotal = 0
        let transferTotal = 0

        const expenseCategoryMap = new Map<string, CategoryAgg>()
        const incomeCategoryMap = new Map<string, CategoryAgg>()

        const accountMap = new Map<string, AccountAgg>()

        for (const t of allTx as Tx[]) {
            const amt = Number(serializeDecimal(t.amount))
            // Type handling
            if (t.type === 'INCOME') {
                incomeTotal += amt
                // account-level
                if (t.accountId) {
                    const key = t.accountId
                    const existing = accountMap.get(key)
                    const acc: AccountAgg = existing ?? {
                        accountId: key,
                        name: t.account?.name ?? null,
                        type: t.account?.type ?? null,
                        color: t.account?.color ?? null,
                        icon: t.account?.icon ?? null,
                        incomeTotal: 0,
                        expenseTotal: 0,
                        adjustmentTotal: 0,
                        transferInTotal: 0,
                        transferOutTotal: 0,
                        netTotal: 0,
                        transactionCount: 0,
                    }
                    acc.incomeTotal += amt
                    acc.netTotal += amt
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }

                // category
                if (t.categoryId && t.category) {
                    const key = t.categoryId
                    const existing = incomeCategoryMap.get(key)
                    const entry: CategoryAgg = existing ?? {
                        total: 0,
                        count: 0,
                        name: t.category.name ?? null,
                        icon: t.category.icon ?? null,
                        section: t.category.section ?? null,
                    }
                    entry.total += amt
                    entry.count += 1
                    incomeCategoryMap.set(key, entry)
                }
            } else if (t.type === 'EXPENSE') {
                expenseTotal += amt
                if (t.accountId) {
                    const key = t.accountId
                    const existing = accountMap.get(key)
                    const acc: AccountAgg = existing ?? {
                        accountId: key,
                        name: t.account?.name ?? null,
                        type: t.account?.type ?? null,
                        color: t.account?.color ?? null,
                        icon: t.account?.icon ?? null,
                        incomeTotal: 0,
                        expenseTotal: 0,
                        adjustmentTotal: 0,
                        transferInTotal: 0,
                        transferOutTotal: 0,
                        netTotal: 0,
                        transactionCount: 0,
                    }
                    acc.expenseTotal += amt
                    acc.netTotal -= amt
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }

                if (t.categoryId && t.category) {
                    const key = t.categoryId
                    const existing = expenseCategoryMap.get(key)
                    const entry: CategoryAgg = existing ?? {
                        total: 0,
                        count: 0,
                        name: t.category.name ?? null,
                        icon: t.category.icon ?? null,
                        section: t.category.section ?? null,
                    }
                    entry.total += amt
                    entry.count += 1
                    expenseCategoryMap.set(key, entry)
                }
            } else if (t.type === 'ADJUSTMENT') {
                adjustmentTotal += amt
                if (t.accountId) {
                    const key = t.accountId
                    const existing = accountMap.get(key)
                    const acc: AccountAgg = existing ?? {
                        accountId: key,
                        name: t.account?.name ?? null,
                        type: t.account?.type ?? null,
                        color: t.account?.color ?? null,
                        icon: t.account?.icon ?? null,
                        incomeTotal: 0,
                        expenseTotal: 0,
                        adjustmentTotal: 0,
                        transferInTotal: 0,
                        transferOutTotal: 0,
                        netTotal: 0,
                        transactionCount: 0,
                    }
                    acc.adjustmentTotal += amt
                    acc.netTotal += amt
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }
            } else if (t.type === 'TRANSFER') {
                transferTotal += amt
                // fromAccount -> transferOut
                if (t.fromAccountId) {
                    const key = t.fromAccountId
                    const existing = accountMap.get(key)
                    const acc: AccountAgg = existing ?? {
                        accountId: key,
                        name: t.fromAccount?.name ?? null,
                        type: null,
                        color: t.fromAccount?.color ?? null,
                        icon: t.fromAccount?.icon ?? null,
                        incomeTotal: 0,
                        expenseTotal: 0,
                        adjustmentTotal: 0,
                        transferInTotal: 0,
                        transferOutTotal: 0,
                        netTotal: 0,
                        transactionCount: 0,
                    }
                    acc.transferOutTotal += amt
                    acc.netTotal -= amt
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }
                // toAccount -> transferIn
                if (t.toAccountId) {
                    const key = t.toAccountId
                    const existing = accountMap.get(key)
                    const acc: AccountAgg = existing ?? {
                        accountId: key,
                        name: t.toAccount?.name ?? null,
                        type: null,
                        color: t.toAccount?.color ?? null,
                        icon: t.toAccount?.icon ?? null,
                        incomeTotal: 0,
                        expenseTotal: 0,
                        adjustmentTotal: 0,
                        transferInTotal: 0,
                        transferOutTotal: 0,
                        netTotal: 0,
                        transactionCount: 0,
                    }
                    acc.transferInTotal += amt
                    acc.netTotal += amt
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }
            }
        }

        const transactionCount = allTx.length
        const netTotal = incomeTotal - expenseTotal + adjustmentTotal

        // Build top categories arrays
        const topExpenseCategories = Array.from(expenseCategoryMap.entries())
            .map(([categoryId, v]) => ({
                categoryId,
                name: v.name,
                icon: v.icon,
                section: v.section,
                total: serializeDecimal(v.total),
                transactionCount: v.count,
                percentage: expenseTotal === 0 ? 0 : (v.total / expenseTotal) * 100,
            }))
            .sort((a, b) => Number(b.total) - Number(a.total))

        const topIncomeCategories = Array.from(incomeCategoryMap.entries())
            .map(([categoryId, v]) => ({
                categoryId,
                name: v.name,
                icon: v.icon,
                section: v.section,
                total: serializeDecimal(v.total),
                transactionCount: v.count,
                percentage: incomeTotal === 0 ? 0 : (v.total / incomeTotal) * 100,
            }))
            .sort((a, b) => Number(b.total) - Number(a.total))

        const accountBreakdown = Array.from(accountMap.values()).map((a) => ({
            accountId: a.accountId,
            name: a.name,
            type: a.type,
            color: a.color,
            icon: a.icon,
            incomeTotal: serializeDecimal(a.incomeTotal),
            expenseTotal: serializeDecimal(a.expenseTotal),
            adjustmentTotal: serializeDecimal(a.adjustmentTotal),
            transferInTotal: serializeDecimal(a.transferInTotal),
            transferOutTotal: serializeDecimal(a.transferOutTotal),
            netTotal: serializeDecimal(a.netTotal),
            transactionCount: a.transactionCount,
        }))

        const serializedRecent = (recent as Tx[]).map((t) => ({
            id: t.id,
            type: t.type,
            amount: serializeDecimal(t.amount),
            date: toIso(t.date),
            merchant: t.merchant ?? null,
            note: t.note ?? null,
            accountId: t.accountId ?? null,
            categoryId: t.categoryId ?? null,
            account: t.account ?? null,
            category: t.category ?? null,
        }))

        return {
            month: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`,
            period: {
                startDate: start.toISOString().slice(0, 10),
                endDate: new Date(next.getTime() - 1).toISOString().slice(0, 10),
            },
            totals: {
                incomeTotal: serializeDecimal(incomeTotal),
                expenseTotal: serializeDecimal(expenseTotal),
                adjustmentTotal: serializeDecimal(adjustmentTotal),
                transferTotal: serializeDecimal(transferTotal),
                netTotal: serializeDecimal(netTotal),
                transactionCount,
            },
            topExpenseCategories,
            topIncomeCategories,
            accountBreakdown,
            recentTransactions: serializedRecent,
        }
    } catch {
        throw new AppError('INTERNAL_SERVER_ERROR', 'Failed to compute monthly summary', 500)
    }
}
