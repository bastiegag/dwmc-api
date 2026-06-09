import type { Account } from '@prisma/client'
import type { AuthUser } from '../../types/app.js'
import { AppError } from '../../shared/errors/AppError.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import {
    archiveForUser,
    createForUser,
    findByIdForUser,
    findDuplicateByName,
    findManyByUserProfileId,
    updateForUser,
} from './account.repository.js'
import type {
    CreateAccountInput,
    GetAccountsQueryInput,
    UpdateAccountInput,
} from './account.schema.js'

/**
 * Converts Prisma Decimal fields to numbers and adds the computed `currentBalance` field.
 * currentBalance equals startingBalance until transactions are implemented.
 */
function serializeAccount(account: Account) {
    const startingBalance = Number(account.startingBalance)
    return {
        ...account,
        startingBalance,
        goal: account.goal !== null ? Number(account.goal) : null,
        currentBalance: startingBalance,
    }
}

export async function listAccounts(authUser: AuthUser, query: GetAccountsQueryInput) {
    const profile = await getOrCreateUserProfile(authUser)
    const accounts = await findManyByUserProfileId(profile.id, {
        includeArchived: query.includeArchived,
        type: query.type,
    })
    return accounts.map(serializeAccount)
}

export async function createAccount(authUser: AuthUser, input: CreateAccountInput) {
    const profile = await getOrCreateUserProfile(authUser)

    const duplicate = await findDuplicateByName(profile.id, input.name)
    if (duplicate) {
        throw new AppError('CONFLICT', 'Account name already exists', 409)
    }

    const account = await createForUser(profile.id, {
        name: input.name,
        type: input.type ?? 'CHECKING',
        startingBalance: input.startingBalance ?? 0,
        goal: input.goal ?? null,
        color: input.color,
        icon: input.icon,
    })

    return serializeAccount(account)
}

export async function getAccountById(authUser: AuthUser, id: string) {
    const profile = await getOrCreateUserProfile(authUser)

    const account = await findByIdForUser(id, profile.id)
    if (!account) {
        throw new AppError('NOT_FOUND', 'Account not found', 404)
    }

    return serializeAccount(account)
}

export async function updateAccount(authUser: AuthUser, id: string, input: UpdateAccountInput) {
    const profile = await getOrCreateUserProfile(authUser)

    const existing = await findByIdForUser(id, profile.id)
    if (!existing) {
        throw new AppError('NOT_FOUND', 'Account not found', 404)
    }

    if (input.name) {
        const duplicate = await findDuplicateByName(profile.id, input.name, id)
        if (duplicate) {
            throw new AppError('CONFLICT', 'Account name already exists', 409)
        }
    }

    const updated = await updateForUser(id, profile.id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.startingBalance !== undefined ? { startingBalance: input.startingBalance } : {}),
        ...(input.goal !== undefined ? { goal: input.goal } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
    })

    if (!updated) {
        throw new AppError('NOT_FOUND', 'Account not found', 404)
    }

    return serializeAccount(updated)
}

export async function archiveAccount(authUser: AuthUser, id: string) {
    const profile = await getOrCreateUserProfile(authUser)

    const existing = await findByIdForUser(id, profile.id)
    if (!existing) {
        throw new AppError('NOT_FOUND', 'Account not found', 404)
    }

    const archived = await archiveForUser(id, profile.id)
    if (!archived) {
        throw new AppError('NOT_FOUND', 'Account not found', 404)
    }

    return serializeAccount(archived)
}
