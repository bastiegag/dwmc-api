import type { AuthUser } from '../../types/app.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import { fromCents, serializeDecimal, toCents } from '../../shared/money/decimal.js'
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
    totalCents: bigint
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
    incomeTotalCents: bigint
    expenseTotalCents: bigint
    adjustmentTotalCents: bigint
    transferInTotalCents: bigint
    transferOutTotalCents: bigint
    netTotalCents: bigint
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
        let incomeTotalCents = 0n
        let expenseTotalCents = 0n
        let adjustmentTotalCents = 0n
        let transferTotalCents = 0n

        const expenseCategoryMap = new Map<string, CategoryAgg>()
        const incomeCategoryMap = new Map<string, CategoryAgg>()

        const accountMap = new Map<string, AccountAgg>()

        for (const t of allTx as Tx[]) {
            const amountCents = toCents(t.amount)
            // Type handling
            if (t.type === 'INCOME') {
                incomeTotalCents += amountCents
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
                        incomeTotalCents: 0n,
                        expenseTotalCents: 0n,
                        adjustmentTotalCents: 0n,
                        transferInTotalCents: 0n,
                        transferOutTotalCents: 0n,
                        netTotalCents: 0n,
                        transactionCount: 0,
                    }
                    acc.incomeTotalCents += amountCents
                    acc.netTotalCents += amountCents
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }

                // category
                if (t.categoryId && t.category) {
                    const key = t.categoryId
                    const existing = incomeCategoryMap.get(key)
                    const entry: CategoryAgg = existing ?? {
                        totalCents: 0n,
                        count: 0,
                        name: t.category.name ?? null,
                        icon: t.category.icon ?? null,
                        section: t.category.section ?? null,
                    }
                    entry.totalCents += amountCents
                    entry.count += 1
                    incomeCategoryMap.set(key, entry)
                }
            } else if (t.type === 'EXPENSE') {
                expenseTotalCents += amountCents
                if (t.accountId) {
                    const key = t.accountId
                    const existing = accountMap.get(key)
                    const acc: AccountAgg = existing ?? {
                        accountId: key,
                        name: t.account?.name ?? null,
                        type: t.account?.type ?? null,
                        color: t.account?.color ?? null,
                        icon: t.account?.icon ?? null,
                        incomeTotalCents: 0n,
                        expenseTotalCents: 0n,
                        adjustmentTotalCents: 0n,
                        transferInTotalCents: 0n,
                        transferOutTotalCents: 0n,
                        netTotalCents: 0n,
                        transactionCount: 0,
                    }
                    acc.expenseTotalCents += amountCents
                    acc.netTotalCents -= amountCents
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }

                if (t.categoryId && t.category) {
                    const key = t.categoryId
                    const existing = expenseCategoryMap.get(key)
                    const entry: CategoryAgg = existing ?? {
                        totalCents: 0n,
                        count: 0,
                        name: t.category.name ?? null,
                        icon: t.category.icon ?? null,
                        section: t.category.section ?? null,
                    }
                    entry.totalCents += amountCents
                    entry.count += 1
                    expenseCategoryMap.set(key, entry)
                }
            } else if (t.type === 'ADJUSTMENT') {
                adjustmentTotalCents += amountCents
                if (t.accountId) {
                    const key = t.accountId
                    const existing = accountMap.get(key)
                    const acc: AccountAgg = existing ?? {
                        accountId: key,
                        name: t.account?.name ?? null,
                        type: t.account?.type ?? null,
                        color: t.account?.color ?? null,
                        icon: t.account?.icon ?? null,
                        incomeTotalCents: 0n,
                        expenseTotalCents: 0n,
                        adjustmentTotalCents: 0n,
                        transferInTotalCents: 0n,
                        transferOutTotalCents: 0n,
                        netTotalCents: 0n,
                        transactionCount: 0,
                    }
                    acc.adjustmentTotalCents += amountCents
                    acc.netTotalCents += amountCents
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }
            } else if (t.type === 'TRANSFER') {
                transferTotalCents += amountCents
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
                        incomeTotalCents: 0n,
                        expenseTotalCents: 0n,
                        adjustmentTotalCents: 0n,
                        transferInTotalCents: 0n,
                        transferOutTotalCents: 0n,
                        netTotalCents: 0n,
                        transactionCount: 0,
                    }
                    acc.transferOutTotalCents += amountCents
                    acc.netTotalCents -= amountCents
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
                        incomeTotalCents: 0n,
                        expenseTotalCents: 0n,
                        adjustmentTotalCents: 0n,
                        transferInTotalCents: 0n,
                        transferOutTotalCents: 0n,
                        netTotalCents: 0n,
                        transactionCount: 0,
                    }
                    acc.transferInTotalCents += amountCents
                    acc.netTotalCents += amountCents
                    acc.transactionCount += 1
                    accountMap.set(key, acc)
                }
            }
        }

        const transactionCount = allTx.length
        const netTotalCents = incomeTotalCents - expenseTotalCents + adjustmentTotalCents

        // Build top categories arrays
        const topExpenseCategories = Array.from(expenseCategoryMap.entries())
            .map(([categoryId, v]) => ({
                categoryId,
                name: v.name,
                icon: v.icon,
                section: v.section,
                total: fromCents(v.totalCents),
                transactionCount: v.count,
                percentage:
                    expenseTotalCents === 0n
                        ? 0
                        : (Number(v.totalCents) / Number(expenseTotalCents)) * 100,
            }))
            .sort((a, b) => b.total - a.total)

        const topIncomeCategories = Array.from(incomeCategoryMap.entries())
            .map(([categoryId, v]) => ({
                categoryId,
                name: v.name,
                icon: v.icon,
                section: v.section,
                total: fromCents(v.totalCents),
                transactionCount: v.count,
                percentage:
                    incomeTotalCents === 0n
                        ? 0
                        : (Number(v.totalCents) / Number(incomeTotalCents)) * 100,
            }))
            .sort((a, b) => b.total - a.total)

        const accountBreakdown = Array.from(accountMap.values()).map((a) => ({
            accountId: a.accountId,
            name: a.name,
            type: a.type,
            color: a.color,
            icon: a.icon,
            incomeTotal: fromCents(a.incomeTotalCents),
            expenseTotal: fromCents(a.expenseTotalCents),
            adjustmentTotal: fromCents(a.adjustmentTotalCents),
            transferInTotal: fromCents(a.transferInTotalCents),
            transferOutTotal: fromCents(a.transferOutTotalCents),
            netTotal: fromCents(a.netTotalCents),
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
                incomeTotal: fromCents(incomeTotalCents),
                expenseTotal: fromCents(expenseTotalCents),
                adjustmentTotal: fromCents(adjustmentTotalCents),
                transferTotal: fromCents(transferTotalCents),
                netTotal: fromCents(netTotalCents),
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
