import { prisma } from '../../db/prisma.js'
import { serializeDecimal } from '../../shared/money/decimal.js'

/**
 * Calculate current account balance by aggregating non-archived transactions.
 */
export async function calculateAccountBalance(
    userProfileId: string,
    accountId: string,
    startingBalance: number,
) {
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

    const sum = (val: unknown) => {
        const v = val as { _sum?: { amount?: unknown } } | undefined
        return v && v._sum && v._sum.amount ? serializeDecimal(v._sum.amount) : 0
    }

    const total =
        startingBalance +
        sum(income) -
        sum(expense) +
        sum(adjustment) +
        sum(incoming) -
        sum(outgoing)

    return total
}

export default { calculateAccountBalance }
