import { Prisma, type AccountType } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

export async function findManyByUserProfileId(
    userProfileId: string,
    options: { includeArchived: boolean; type?: AccountType },
) {
    return prisma.account.findMany({
        where: {
            userProfileId,
            ...(options.includeArchived ? {} : { isArchived: false }),
            ...(options.type ? { type: options.type } : {}),
        },
        orderBy: { name: 'asc' },
    })
}

export async function findByIdForUser(id: string, userProfileId: string) {
    return prisma.account.findFirst({
        where: { id, userProfileId },
    })
}

export async function createForUser(
    userProfileId: string,
    data: {
        name: string
        type: AccountType
        startingBalance: number
        goal: number | null
        color: string
        icon: string
    },
) {
    return prisma.account.create({
        data: {
            userProfileId,
            name: data.name,
            type: data.type,
            startingBalance: data.startingBalance,
            goal: data.goal,
            color: data.color,
            icon: data.icon,
        },
    })
}

export async function updateForUser(
    id: string,
    userProfileId: string,
    data: Prisma.AccountUpdateInput,
) {
    try {
        return await prisma.account.update({
            where: { id, userProfileId },
            data,
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
        return await prisma.account.update({
            where: { id, userProfileId },
            data: { isArchived: true },
        })
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
            return null
        }
        throw e
    }
}

export async function findDuplicateByName(userProfileId: string, name: string, excludeId?: string) {
    return prisma.account.findFirst({
        where: {
            userProfileId,
            name,
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
    })
}
