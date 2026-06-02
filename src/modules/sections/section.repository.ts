import { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

export async function findManyByUserProfileId(
  userProfileId: string,
  options: {
    includeArchived: boolean
    includeCategories: boolean
    includeCategoryArchived: boolean
    cursor?: string
    limit: number
  },
) {
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
              ...(options.includeCategoryArchived ? {} : { where: { isArchived: false } }),
              orderBy: { name: 'asc' },
            },
          },
        }
      : {}),
  })

  const hasNextPage = items.length > options.limit
  const data = hasNextPage ? items.slice(0, options.limit) : items
  return { items: data, nextCursor: hasNextPage ? data[data.length - 1].id : null }
}

export async function findByIdForUser(
  id: string,
  userProfileId: string,
  options?: { includeCategories: boolean },
) {
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

export async function createForUser(userProfileId: string, data: { name: string; color: string }) {
  return prisma.section.create({
    data: {
      userProfileId,
      name: data.name,
      color: data.color,
    },
  })
}

export async function updateForUser(
  id: string,
  userProfileId: string,
  data: Prisma.SectionUpdateInput,
) {
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

export async function archiveForUser(id: string, userProfileId: string) {
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

export async function findDuplicateByName(userProfileId: string, name: string, excludeId?: string) {
  return prisma.section.findFirst({
    where: {
      userProfileId,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
}

export async function archiveCategoriesForSection(sectionId: string, userProfileId: string) {
  return prisma.category.updateMany({
    where: {
      sectionId,
      userProfileId,
    },
    data: { isArchived: true },
  })
}
