import { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

export async function findManyByUserProfileId(
  userProfileId: string,
  options: { includeArchived: boolean; sectionId?: string; cursor?: string; limit: number },
) {
  const items = await prisma.category.findMany({
    where: {
      userProfileId,
      ...(options.includeArchived ? {} : { isArchived: false }),
      ...(options.sectionId ? { sectionId: options.sectionId } : {}),
    },
    orderBy: { name: 'asc' },
    take: options.limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  })

  const hasNextPage = items.length > options.limit
  const data = hasNextPage ? items.slice(0, options.limit) : items
  return { items: data, nextCursor: hasNextPage ? data[data.length - 1].id : null }
}

export async function findByIdForUser(id: string, userProfileId: string) {
  return prisma.category.findFirst({
    where: { id, userProfileId },
  })
}

export async function createForUser(
  userProfileId: string,
  data: { name: string; icon: string; sectionId: string },
) {
  return prisma.category.create({
    data: {
      userProfileId,
      name: data.name,
      icon: data.icon,
      sectionId: data.sectionId,
    },
  })
}

export async function updateForUser(
  id: string,
  userProfileId: string,
  data: Prisma.CategoryUpdateInput,
) {
  try {
    return await prisma.category.update({
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
    return await prisma.category.update({
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

export async function findDuplicateByNameInSection(
  userProfileId: string,
  sectionId: string,
  name: string,
  excludeId?: string,
) {
  return prisma.category.findFirst({
    where: {
      userProfileId,
      sectionId,
      name,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
}
