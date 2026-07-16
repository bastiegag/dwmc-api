import type { Prisma, TransactionType } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

type FindManyOptions = {
    includeArchived: boolean
    type?: TransactionType
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

export const transactionInclude = {
    account: { select: { id: true, name: true, color: true, icon: true } },
    fromAccount: { select: { id: true, name: true, color: true, icon: true } },
    toAccount: { select: { id: true, name: true, color: true, icon: true } },
    category: { select: { id: true, name: true, icon: true, sectionId: true } },
} satisfies Prisma.TransactionInclude

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
    include: typeof transactionInclude
}>

const isPrismaNotFoundError = (error: unknown): error is { code: string } => {
    if (typeof error !== 'object' || error === null) return false
    return 'code' in error && typeof (error as { code?: unknown }).code === 'string'
}

const buildWhere = (userProfileId: string, options: FindManyOptions) => {
    const where: Prisma.TransactionWhereInput = { userProfileId }
    if (!options.includeArchived) where.isArchived = false
    if (options.type) where.type = options.type
    if (options.accountId) where.accountId = options.accountId
    if (options.categoryId) where.categoryId = options.categoryId
    if (options.fromAccountId) where.fromAccountId = options.fromAccountId
    if (options.toAccountId) where.toAccountId = options.toAccountId
    if (options.startDate || options.endDate) {
        const dateFilter: Prisma.DateTimeFilter = {}
        if (options.startDate) dateFilter.gte = new Date(options.startDate)
        if (options.endDate) dateFilter.lte = new Date(options.endDate)
        where.date = dateFilter
    }
    if (options.search) {
        where.OR = [
            { merchant: { contains: options.search } },
            { note: { contains: options.search } },
        ]
    }

    return where
}

export const findManyByUserProfileId = async (userProfileId: string, options: FindManyOptions) => {
    const items = await prisma.transaction.findMany({
        where: buildWhere(userProfileId, options),
        include: transactionInclude,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        ...(options.skip !== undefined ? { skip: options.skip } : {}),
        ...(options.take !== undefined ? { take: options.take } : {}),
    })

    return items
}

export const countManyByUserProfileId = async (userProfileId: string, options: FindManyOptions) => {
    return prisma.transaction.count({ where: buildWhere(userProfileId, options) })
}

export const findByIdForUser = async (id: string, userProfileId: string) => {
    return prisma.transaction.findFirst({
        where: { id, userProfileId },
        include: transactionInclude,
    })
}

export const createForUser = async (
    userProfileId: string,
    data: Prisma.TransactionUncheckedCreateInput,
) => {
    return prisma.transaction.create({
        data: { ...data, userProfileId },
        include: transactionInclude,
    })
}

export const updateForUser = async (
    id: string,
    userProfileId: string,
    data: Prisma.TransactionUpdateInput,
) => {
    try {
        return await prisma.transaction.update({
            where: { id, userProfileId },
            data,
            include: transactionInclude,
        })
    } catch (e) {
        // Prisma P2025: record not found
        // Mirror pattern used across repositories
        if (isPrismaNotFoundError(e) && e.code === 'P2025') return null
        throw e
    }
}

export const archiveForUser = async (id: string, userProfileId: string) => {
    try {
        return await prisma.transaction.update({
            where: { id, userProfileId },
            data: { isArchived: true },
            include: transactionInclude,
        })
    } catch (e) {
        if (isPrismaNotFoundError(e) && e.code === 'P2025') return null
        throw e
    }
}
