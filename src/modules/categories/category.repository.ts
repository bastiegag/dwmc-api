import type { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

export async function findManyByUserProfileId(
  userProfileId: string,
  options: { includeArchived: boolean; sectionId?: string },
) {
  return prisma.category.findMany({
    where: {
      userProfileId,
      ...(options.includeArchived ? {} : { isArchived: false }),
      ...(options.sectionId ? { sectionId: options.sectionId } : {}),
    },
    orderBy: { name: 'asc' },
  })
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
  await prisma.category.updateMany({
    where: { id, userProfileId },
    data,
  })

  return prisma.category.findFirst({
    where: { id, userProfileId },
  })
}

export async function archiveForUser(id: string, userProfileId: string) {
  await prisma.category.updateMany({
    where: { id, userProfileId },
    data: { isArchived: true },
  })

  return prisma.category.findFirst({
    where: { id, userProfileId },
  })
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
