import type { AuthUser } from '../../types/app.js'
import { AppError } from '../../shared/errors/AppError.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import { findByIdForUser as findSectionByIdForUser } from '../sections/section.repository.js'
import {
  archiveForUser,
  createForUser,
  findByIdForUser,
  findDuplicateByNameInSection,
  findManyByUserProfileId,
  updateForUser,
} from './category.repository.js'
import type {
  CreateCategoryInput,
  GetCategoriesQueryInput,
  UpdateCategoryInput,
} from './category.schema.js'

export async function listCategories(authUser: AuthUser, query: GetCategoriesQueryInput) {
  const profile = await getOrCreateUserProfile(authUser)

  if (query.sectionId) {
    const section = await findSectionByIdForUser(query.sectionId, profile.id)
    if (!section) {
      throw new AppError('VALIDATION_ERROR', 'Invalid sectionId', 400)
    }
  }

  return findManyByUserProfileId(profile.id, {
    includeArchived: query.includeArchived,
    sectionId: query.sectionId,
    cursor: query.cursor,
    limit: query.limit,
  })
}

export async function createCategory(authUser: AuthUser, input: CreateCategoryInput) {
  const profile = await getOrCreateUserProfile(authUser)

  const section = await findSectionByIdForUser(input.sectionId, profile.id)
  if (!section) {
    throw new AppError('VALIDATION_ERROR', 'Invalid sectionId', 400)
  }

  const duplicate = await findDuplicateByNameInSection(profile.id, input.sectionId, input.name)
  if (duplicate) {
    throw new AppError('CONFLICT', 'Category name already exists in section', 409)
  }

  return createForUser(profile.id, input)
}

export async function getCategoryById(authUser: AuthUser, id: string) {
  const profile = await getOrCreateUserProfile(authUser)

  const category = await findByIdForUser(id, profile.id)
  if (!category) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  return category
}

export async function updateCategory(authUser: AuthUser, id: string, input: UpdateCategoryInput) {
  const profile = await getOrCreateUserProfile(authUser)

  const existing = await findByIdForUser(id, profile.id)
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  const targetSectionId = input.sectionId ?? existing.sectionId
  if (input.sectionId) {
    const section = await findSectionByIdForUser(input.sectionId, profile.id)
    if (!section) {
      throw new AppError('VALIDATION_ERROR', 'Invalid sectionId', 400)
    }
  }

  if (input.name || input.sectionId) {
    const duplicate = await findDuplicateByNameInSection(
      profile.id,
      targetSectionId,
      input.name ?? existing.name,
      id,
    )

    if (duplicate) {
      throw new AppError('CONFLICT', 'Category name already exists in section', 409)
    }
  }

  const updated = await updateForUser(id, profile.id, input)
  if (!updated) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  return updated
}

export async function archiveCategory(authUser: AuthUser, id: string) {
  const profile = await getOrCreateUserProfile(authUser)

  const existing = await findByIdForUser(id, profile.id)
  if (!existing) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  const archived = await archiveForUser(id, profile.id)
  if (!archived) {
    throw new AppError('NOT_FOUND', 'Category not found', 404)
  }

  return archived
}
