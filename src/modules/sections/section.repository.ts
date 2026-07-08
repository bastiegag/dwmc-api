import { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

export const findManyByUserProfileId = async (
    userProfileId: string,
    options: {
        includeArchived: boolean
        includeCategories: boolean
        includeCategoryArchived: boolean
        cursor?: string
        limit: number
    },
) => {
    const items = await prisma.section.findMany({
        where: {
            userProfileId,
            ...(options.includeArchived ? {} : { isArchived: false }),
        },
        orderBy: { name: 'asc' },
        take: options.limit + 1,
        ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
        ...(options.includeCategories
            ? {
                  include: {
                      categories: {
                          ...(options.includeCategoryArchived
                              ? {}
                              : { where: { isArchived: false } }),
                          orderBy: { name: 'asc' },
                      },
                  },
              }
            : {}),
    })

    const hasNextPage = items.length > options.limit
    const data = hasNextPage ? items.slice(0, options.limit) : items
    const lastId = data.at(-1)?.id ?? null
    return { items: data, nextCursor: hasNextPage ? lastId : null }
}

export const findByIdForUser = async (
    id: string,
    userProfileId: string,
    options?: { includeCategories: boolean },
) => {
    return prisma.section.findFirst({
        where: { id, userProfileId },
        ...(options?.includeCategories
            ? {
                  include: {
                      categories: {
                          where: { isArchived: false },
                          orderBy: { name: 'asc' },
                      },
                  },
              }
            : {}),
    })
}

export const createForUser = async (
    userProfileId: string,
    data: { name: string; color: string },
) => {
    return prisma.section.create({
        data: {
            userProfileId,
            name: data.name,
            color: data.color,
        },
    })
}

export const updateForUser = async (
    id: string,
    userProfileId: string,
    data: Prisma.SectionUpdateInput,
) => {
    try {
        return await prisma.section.update({
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

export const archiveForUser = async (id: string, userProfileId: string) => {
    try {
        return await prisma.section.update({
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

export const findDuplicateByName = async (
    userProfileId: string,
    name: string,
    excludeId?: string,
) => {
    return prisma.section.findFirst({
        where: {
            userProfileId,
            name,
            ...(excludeId ? { id: { not: excludeId } } : {}),
        },
    })
}

export const archiveCategoriesForSection = async (sectionId: string, userProfileId: string) => {
    return prisma.category.updateMany({
        where: {
            sectionId,
            userProfileId,
        },
        data: { isArchived: true },
    })
}
