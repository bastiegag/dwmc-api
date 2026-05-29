import { prisma } from '../../db/prisma.js'
import { AppError } from '../../shared/errors/AppError.js'
import {
  archiveForUser,
  createForUser,
  findByIdForUser,
  findDuplicateByName,
  findManyByUserProfileId,
  updateForUser,
} from './category.repository.js'
import type {
  CreateCategoryInput,
  GetCategoriesQueryInput,
  UpdateCategoryInput,
} from './category.schema.js'

async function getUserProfileId(authUserId: string) {
  const profile = await prisma.userProfile.findUnique({ where: { authUserId } })

  if (!profile) {
    throw new AppError('NOT_FOUND', 'User profile not found', 404)
  }

  return profile.id
}

async function validateParent(parentId: string | null, userProfileId: string, categoryId?: string) {
  if (parentId === null || parentId === undefined) {
    return
  }

  if (categoryId && parentId === categoryId) {
    throw new AppError('VALIDATION_ERROR', 'Category cannot be its own parent', 400)
  }

  const parent = await findByIdForUser(parentId, userProfileId)
  if (!parent) {
    throw new AppError('VALIDATION_ERROR', 'Invalid parent category', 400)
  }
}

async function assertNoDuplicate(
  userProfileId: string,
  name: string,
  type: 'INCOME' | 'EXPENSE',
  parentId: string | null,
  excludeId?: string,
) {
  const duplicate = await findDuplicateByName(userProfileId, name, type, parentId, excludeId)
  if (duplicate) {
    throw new AppError('CONFLICT', 'Category already exists', 409)
  }
}

export async function listCategories(authUserId: string, filters: GetCategoriesQueryInput) {
  const userProfileId = await getUserProfileId(authUserId)

  return findManyByUserProfileId(userProfileId, {
    type: filters.type,
    includeArchived: filters.includeArchived ?? false,
  })
}

export async function createCategory(authUserId: string, input: CreateCategoryInput) {
  const userProfileId = await getUserProfileId(authUserId)

  await validateParent(input.parentId ?? null, userProfileId)
  await assertNoDuplicate(userProfileId, input.name, input.type, input.parentId ?? null)

  return createForUser(userProfileId, {
    name: input.name,
    type: input.type,
    color: input.color,
    icon: input.icon,
    parentId: input.parentId ?? null,
  })
}

export async function getCategoryById(authUserId: string, id: string) {
  const userProfileId = await getUserProfileId(authUserId)
  const category = await findByIdForUser(id, userProfileId)

  if (!category) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  return category
}

export async function patchCategory(authUserId: string, id: string, input: UpdateCategoryInput) {
  const userProfileId = await getUserProfileId(authUserId)
  const existing = await findByIdForUser(id, userProfileId)

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  const nextName = input.name ?? existing.name
  const nextType = input.type ?? existing.type
  const nextParentId = input.parentId === undefined ? existing.parentId : input.parentId

  await validateParent(nextParentId, userProfileId, id)
  await assertNoDuplicate(userProfileId, nextName, nextType, nextParentId, id)

  const updated = await updateForUser(id, userProfileId, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.type !== undefined ? { type: input.type } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.icon !== undefined ? { icon: input.icon } : {}),
    ...(input.parentId !== undefined
      ? {
          parent: input.parentId ? { connect: { id: input.parentId } } : { disconnect: true },
        }
      : {}),
    ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
  })

  if (!updated) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  return updated
}

export async function deleteCategory(authUserId: string, id: string) {
  const userProfileId = await getUserProfileId(authUserId)
  const archived = await archiveForUser(id, userProfileId)

  if (!archived) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  return archived
}
