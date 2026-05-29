import type { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

type FindManyFilters = {
  type?: 'INCOME' | 'EXPENSE'
  includeArchived?: boolean
}

type DuplicateType = 'INCOME' | 'EXPENSE'
type CategoryCreateData = Omit<Prisma.CategoryUncheckedCreateInput, 'userProfileId'>

export async function findManyByUserProfileId(userProfileId: string, filters: FindManyFilters) {
  return prisma.category.findMany({
    where: {
      userProfileId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.includeArchived ? {} : { isArchived: false }),
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
}

export async function findByIdForUser(id: string, userProfileId: string) {
  return prisma.category.findFirst({
    where: {
      id,
      userProfileId,
    },
  })
}

export async function createForUser(userProfileId: string, data: CategoryCreateData) {
  return prisma.category.create({
    data: {
      ...data,
      userProfileId,
    },
  })
}

export async function updateForUser(id: string, userProfileId: string, data: Prisma.CategoryUpdateInput) {
  const updated = await prisma.category.updateMany({
    where: { id, userProfileId },
    data,
  })

  if (updated.count === 0) {
    return null
  }

  return findByIdForUser(id, userProfileId)
}

export async function archiveForUser(id: string, userProfileId: string) {
  return updateForUser(id, userProfileId, { isArchived: true })
}

export async function findDuplicateByName(
  userProfileId: string,
  name: string,
  type: DuplicateType,
  parentId: string | null,
  excludeId?: string,
) {
  return prisma.category.findFirst({
    where: {
      userProfileId,
      name,
      type,
      parentId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  })
}
