import type { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

type FindManyOptions = {
    includeArchived: boolean
    type?: string
    accountId?: string
    categoryId?: string
    fromAccountId?: string
    toAccountId?: string
    startDate?: string
    endDate?: string
    search?: string
    skip?: number
    take?: number
}

function buildWhere(userProfileId: string, options: FindManyOptions) {
    // `where` is dynamically built for Prisma queries.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userProfileId }
    if (!options.includeArchived) where.isArchived = false
    if (options.type) where.type = options.type
    if (options.accountId) where.accountId = options.accountId
    if (options.categoryId) where.categoryId = options.categoryId
    if (options.fromAccountId) where.fromAccountId = options.fromAccountId
    if (options.toAccountId) where.toAccountId = options.toAccountId
    if (options.startDate || options.endDate) {
        where.date = {}
        if (options.startDate) where.date['gte'] = new Date(options.startDate)
        if (options.endDate) where.date['lte'] = new Date(options.endDate)
    }
    if (options.search) {
        where.OR = [
            { merchant: { contains: options.search } },
            { note: { contains: options.search } },
        ]
    }

    return where
}

export async function findManyByUserProfileId(userProfileId: string, options: FindManyOptions) {
    const items = await prisma.transaction.findMany({
        where: buildWhere(userProfileId, options),
        include: {
            account: { select: { id: true, name: true, color: true, icon: true } },
            fromAccount: { select: { id: true, name: true, color: true, icon: true } },
            toAccount: { select: { id: true, name: true, color: true, icon: true } },
            category: { select: { id: true, name: true, icon: true, sectionId: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        ...(options.skip !== undefined ? { skip: options.skip } : {}),
        ...(options.take !== undefined ? { take: options.take } : {}),
    })

    return items
}

export async function countManyByUserProfileId(userProfileId: string, options: FindManyOptions) {
    return prisma.transaction.count({ where: buildWhere(userProfileId, options) })
}

export async function findByIdForUser(id: string, userProfileId: string) {
    return prisma.transaction.findFirst({
        where: { id, userProfileId },
        include: {
            account: { select: { id: true, name: true, color: true, icon: true } },
            fromAccount: { select: { id: true, name: true, color: true, icon: true } },
            toAccount: { select: { id: true, name: true, color: true, icon: true } },
            category: { select: { id: true, name: true, icon: true, sectionId: true } },
        },
    })
}

export async function createForUser(
    userProfileId: string,
    data: Prisma.TransactionUncheckedCreateInput,
) {
    return prisma.transaction.create({
        data: { ...data, userProfileId },
        include: {
            account: { select: { id: true, name: true, color: true, icon: true } },
            fromAccount: { select: { id: true, name: true, color: true, icon: true } },
            toAccount: { select: { id: true, name: true, color: true, icon: true } },
            category: { select: { id: true, name: true, icon: true, sectionId: true } },
        },
    })
}

export async function updateForUser(
    id: string,
    userProfileId: string,
    data: Prisma.TransactionUpdateInput,
) {
    try {
        return await prisma.transaction.update({
            where: { id, userProfileId },
            data,
            include: {
                account: { select: { id: true, name: true, color: true, icon: true } },
                fromAccount: { select: { id: true, name: true, color: true, icon: true } },
                toAccount: { select: { id: true, name: true, color: true, icon: true } },
                category: { select: { id: true, name: true, icon: true, sectionId: true } },
            },
        })
    } catch (e) {
        // Prisma P2025: record not found
        // Mirror pattern used across repositories
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((e as any).code === 'P2025') return null
        throw e
    }
}

export async function archiveForUser(id: string, userProfileId: string) {
    try {
        return await prisma.transaction.update({
            where: { id, userProfileId },
            data: { isArchived: true },
            include: {
                account: { select: { id: true, name: true, color: true, icon: true } },
                fromAccount: { select: { id: true, name: true, color: true, icon: true } },
                toAccount: { select: { id: true, name: true, color: true, icon: true } },
                category: { select: { id: true, name: true, icon: true, sectionId: true } },
            },
        })
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((e as any).code === 'P2025') return null
        throw e
    }
}
