import type { Prisma } from '@prisma/client'
import { prisma } from '../../db/prisma.js'

export async function findManyByUserProfileId(
  userProfileId: string,
  options: { includeArchived: boolean; includeCategories: boolean; includeCategoryArchived: boolean },
) {
  return prisma.section.findMany({
    where: {
      userProfileId,
      ...(options.includeArchived ? {} : { isArchived: false }),
    },
    orderBy: { name: 'asc' },
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
  await prisma.section.updateMany({
    where: { id, userProfileId },
    data,
  })

  return prisma.section.findFirst({
    where: { id, userProfileId },
  })
}

export async function archiveForUser(id: string, userProfileId: string) {
  await prisma.section.updateMany({
    where: { id, userProfileId },
    data: { isArchived: true },
  })

  return prisma.section.findFirst({
    where: { id, userProfileId },
  })
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
