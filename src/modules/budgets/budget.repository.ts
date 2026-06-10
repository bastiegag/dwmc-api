import { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

export async function findManyByUserProfileId(
    userProfileId: string,
    options: { month: string; categoryId?: string; includeArchived?: boolean },
) {
    const items = await prisma.budget.findMany({
        where: {
            userProfileId,
            month: options.month,
            ...(options.includeArchived ? {} : { isArchived: false }),
            ...(options.categoryId ? { categoryId: options.categoryId } : {}),
        },
        include: {
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
        orderBy: [{ category: { section: { name: 'asc' } } }, { category: { name: 'asc' } }],
    })

    return items
}

export async function findByIdForUser(id: string, userProfileId: string) {
    return prisma.budget.findFirst({
        where: { id, userProfileId },
        include: {
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
    })
}

export async function createForUser(
    userProfileId: string,
    data: Prisma.BudgetUncheckedCreateInput,
) {
    return prisma.budget.create({
        data: { ...data, userProfileId },
        include: {
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
    })
}

export async function updateForUser(
    id: string,
    userProfileId: string,
    data: Prisma.BudgetUpdateInput,
) {
    try {
        return await prisma.budget.update({
            where: { id, userProfileId },
            data,
            include: {
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
        })
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return null
        }
        throw e
    }
}

export async function archiveForUser(id: string, userProfileId: string) {
    try {
        return await prisma.budget.update({
            where: { id, userProfileId },
            data: { isArchived: true },
            include: {
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
        })
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return null
        }
        throw e
    }
}

export async function findDuplicateByCategoryAndMonth(
    userProfileId: string,
    categoryId: string,
    month: string,
    excludeId?: string,
) {
    // Some Prisma clients / test mocks may not support passing complex `id` filters
    // (e.g. `{ id: { not: excludeId } }`). To keep behavior deterministic and
    // test-friendly, query by the unique keys then exclude the id in JS if needed.
    const where: Prisma.BudgetWhereInput = { userProfileId, categoryId, month }
    const found = await prisma.budget.findFirst({ where })
    if (!found) return null
    if (excludeId && found.id === excludeId) return null
    return found
}

export async function findExpenseTotalsByCategoryForMonth(
    userProfileId: string,
    startIso: string,
    nextMonthStartIso: string,
) {
    // groupBy by categoryId to get sum and count of expense transactions
    const result = await prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
            userProfileId,
            isArchived: false,
            type: 'EXPENSE',
            date: { gte: new Date(startIso), lt: new Date(nextMonthStartIso) },
            categoryId: { not: null },
        },
        _sum: { amount: true },
        _count: { id: true },
    })

    return result
}

export default {}
