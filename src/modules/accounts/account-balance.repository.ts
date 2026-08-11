import { prisma } from '../../db/prisma.js'

export const findBalanceTotalsByAccountIds = async (
    userProfileId: string,
    accountIds: string[],
) => {
    if (accountIds.length === 0) return []

    return prisma.transaction.groupBy({
        by: ['type', 'accountId', 'fromAccountId', 'toAccountId'],
        where: {
            userProfileId,
            isArchived: false,
            OR: [
                { accountId: { in: accountIds } },
                { fromAccountId: { in: accountIds } },
                { toAccountId: { in: accountIds } },
            ],
        },
        _sum: { amount: true },
    })
}

export type AccountBalanceTotal = Awaited<ReturnType<typeof findBalanceTotalsByAccountIds>>[number]
