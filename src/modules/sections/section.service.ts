import type { AuthUser } from '../../types/app.js'
import { AppError } from '../../shared/errors/AppError.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import {
    archiveCategoriesForSection,
    archiveForUser,
    createForUser,
    findByIdForUser,
    findDuplicateByName,
    findManyByUserProfileId,
    updateForUser,
} from './section.repository.js'
import type {
    CreateSectionInput,
    GetSectionsQueryInput,
    UpdateSectionInput,
} from './section.schema.js'

export const listSections = async (authUser: AuthUser, query: GetSectionsQueryInput) => {
    const profile = await getOrCreateUserProfile(authUser)

    return findManyByUserProfileId(profile.id, {
        includeArchived: query.includeArchived,
        includeCategories: query.includeCategories,
        includeCategoryArchived: query.includeArchived,
        cursor: query.cursor,
        limit: query.limit,
    })
}

export const createSection = async (authUser: AuthUser, input: CreateSectionInput) => {
    const profile = await getOrCreateUserProfile(authUser)

    const duplicate = await findDuplicateByName(profile.id, input.name)
    if (duplicate) {
        throw new AppError('CONFLICT', 'Section name already exists', 409)
    }

    return createForUser(profile.id, input)
}

export const getSectionById = async (
    authUser: AuthUser,
    id: string,
    includeCategories: boolean,
) => {
    const profile = await getOrCreateUserProfile(authUser)

    const section = await findByIdForUser(id, profile.id, { includeCategories })
    if (!section) {
        throw new AppError('NOT_FOUND', 'Section not found', 404)
    }

    return section
}

export const updateSection = async (authUser: AuthUser, id: string, input: UpdateSectionInput) => {
    const profile = await getOrCreateUserProfile(authUser)

    const existing = await findByIdForUser(id, profile.id)
    if (!existing) {
        throw new AppError('NOT_FOUND', 'Section not found', 404)
    }

    if (input.name) {
        const duplicate = await findDuplicateByName(profile.id, input.name, id)
        if (duplicate) {
            throw new AppError('CONFLICT', 'Section name already exists', 409)
        }
    }

    const updated = await updateForUser(id, profile.id, input)
    if (!updated) {
        throw new AppError('NOT_FOUND', 'Section not found', 404)
    }

    return updated
}

export const archiveSection = async (authUser: AuthUser, id: string) => {
    const profile = await getOrCreateUserProfile(authUser)

    const existing = await findByIdForUser(id, profile.id)
    if (!existing) {
        throw new AppError('NOT_FOUND', 'Section not found', 404)
    }

    await archiveCategoriesForSection(id, profile.id)
    const archived = await archiveForUser(id, profile.id)
    if (!archived) {
        throw new AppError('NOT_FOUND', 'Section not found', 404)
    }

    return archived
}
