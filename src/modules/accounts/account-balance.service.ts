import { prisma } from '../../db/prisma.js'
import { fromCents, toCents } from '../../shared/money/decimal.js'

/**
 * Calculate current account balance by aggregating non-archived transactions.
 */
export const calculateAccountBalance = async (
    userProfileId: string,
    accountId: string,
    startingBalance: number,
) => {
    const income = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userProfileId, type: 'INCOME', accountId, isArchived: false },
    })

    const expense = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userProfileId, type: 'EXPENSE', accountId, isArchived: false },
    })

    const adjustment = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userProfileId, type: 'ADJUSTMENT', accountId, isArchived: false },
    })

    const incoming = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userProfileId, type: 'TRANSFER', toAccountId: accountId, isArchived: false },
    })

    const outgoing = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userProfileId, type: 'TRANSFER', fromAccountId: accountId, isArchived: false },
    })

    const sum = (val: unknown): bigint => {
        const v = val as { _sum?: { amount?: unknown } } | undefined
        return v && v._sum && v._sum.amount !== null && v._sum.amount !== undefined
            ? toCents(v._sum.amount)
            : 0n
    }

    const totalCents =
        toCents(startingBalance) +
        sum(income) -
        sum(expense) +
        sum(adjustment) +
        sum(incoming) -
        sum(outgoing)

    return fromCents(totalCents)
}

export default { calculateAccountBalance }
