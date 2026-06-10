import { prisma } from '../../db/prisma.js'

export async function findTransactionsForMonth(
    userProfileId: string,
    startIso: string,
    nextMonthStartIso: string,
) {
    return prisma.transaction.findMany({
        where: {
            userProfileId,
            isArchived: false,
            date: { gte: new Date(startIso), lt: new Date(nextMonthStartIso) },
        },
        include: {
            account: { select: { id: true, name: true, color: true, icon: true } },
            fromAccount: { select: { id: true, name: true, color: true, icon: true } },
            toAccount: { select: { id: true, name: true, color: true, icon: true } },
            category: {
                select: {
                    id: true,
                    name: true,
                    icon: true,
                    sectionId: true,
                    section: { select: { id: true, name: true, color: true } },
                },
            },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })
}

export async function findRecentTransactionsForMonth(
    userProfileId: string,
    startIso: string,
    nextMonthStartIso: string,
    limit: number,
) {
    return prisma.transaction.findMany({
        where: {
            userProfileId,
            isArchived: false,
            date: { gte: new Date(startIso), lt: new Date(nextMonthStartIso) },
        },
        include: {
            account: { select: { id: true, name: true, color: true, icon: true } },
            fromAccount: { select: { id: true, name: true, color: true, icon: true } },
            toAccount: { select: { id: true, name: true, color: true, icon: true } },
            category: {
                select: {
                    id: true,
                    name: true,
                    icon: true,
                    sectionId: true,
                },
            },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit,
    })
}
