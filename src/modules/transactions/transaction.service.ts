import type { AuthUser } from '../../types/app.js'
import type { Prisma } from '@prisma/client'
import { AppError } from '../../shared/errors/AppError.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import { serializeDecimal } from '../../shared/money/decimal.js'
import {
    findManyByUserProfileId,
    countManyByUserProfileId,
    findByIdForUser,
    createForUser,
    updateForUser,
    archiveForUser,
} from './transaction.repository.js'
import { findByIdForUser as findAccountByIdForUser } from '../accounts/account.repository.js'
import { findByIdForUser as findCategoryByIdForUser } from '../categories/category.repository.js'
import type {
    CreateTransactionInput,
    GetTransactionsQueryInput,
    UpdateTransactionInput,
} from './transaction.schema.js'

function serializeTransaction(tx: unknown) {
    const t = tx as Record<string, unknown>
    const toIso = (d: unknown) => {
        const hasIso = d && typeof (d as { toISOString?: unknown }).toISOString === 'function'
        return hasIso
            ? (d as { toISOString: () => string }).toISOString()
            : new Date(String(d)).toISOString()
    }
    return {
        id: t.id,
        type: t.type,
        amount: serializeDecimal(t['amount'] as unknown),
        date: toIso(t.date),
        merchant: (t.merchant ?? null) as string | null,
        note: (t.note ?? null) as string | null,
        accountId: (t.accountId ?? null) as string | null,
        fromAccountId: (t.fromAccountId ?? null) as string | null,
        toAccountId: (t.toAccountId ?? null) as string | null,
        categoryId: (t.categoryId ?? null) as string | null,
        isArchived: t.isArchived as boolean,
        createdAt: toIso(t.createdAt),
        updatedAt: toIso(t.updatedAt),
        account: (t.account ?? null) as Record<string, unknown> | null,
        fromAccount: (t.fromAccount ?? null) as Record<string, unknown> | null,
        toAccount: (t.toAccount ?? null) as Record<string, unknown> | null,
        category: (t.category ?? null) as Record<string, unknown> | null,
    }
}

async function ensureAccountOwned(accountId: string | undefined, userProfileId: string) {
    if (!accountId) return null
    const acct = await findAccountByIdForUser(accountId, userProfileId)
    if (!acct) throw new AppError('NOT_FOUND', 'Account not found', 404)
    return acct
}

async function ensureCategoryOwned(categoryId: string | undefined, userProfileId: string) {
    if (!categoryId) return null
    const cat = await findCategoryByIdForUser(categoryId, userProfileId)
    if (!cat) throw new AppError('NOT_FOUND', 'Category not found', 404)
    return cat
}

export async function listTransactions(authUser: AuthUser, query: GetTransactionsQueryInput) {
    const profile = await getOrCreateUserProfile(authUser)

    // Validate ownership of filter IDs
    if (query.accountId) await ensureAccountOwned(query.accountId, profile.id)
    if (query.fromAccountId) await ensureAccountOwned(query.fromAccountId, profile.id)
    if (query.toAccountId) await ensureAccountOwned(query.toAccountId, profile.id)
    if (query.categoryId) await ensureCategoryOwned(query.categoryId, profile.id)

    // Handle month -> start/end
    let startDate: string | undefined = query.startDate
    let endDate: string | undefined = query.endDate
    if (query.month) {
        const [yStr, mStr] = query.month.split('-')
        const y = Number(yStr)
        const m = Number(mStr)
        const start = new Date(Date.UTC(y, m - 1, 1))
        const next = new Date(Date.UTC(y, m, 1))
        startDate = start.toISOString()
        // use ISO string for endDate (exclusive upper bound handled by query)
        endDate = new Date(next.getTime() - 1).toISOString()
    }

    const skip = (query.page - 1) * query.pageSize
    const take = query.pageSize

    const items = await findManyByUserProfileId(profile.id, {
        includeArchived: Boolean(query.includeArchived),
        type: query.type,
        accountId: query.accountId,
        categoryId: query.categoryId,
        fromAccountId: query.fromAccountId,
        toAccountId: query.toAccountId,
        startDate: startDate,
        endDate: endDate,
        search: query.search,
        skip,
        take,
    })

    const total = await countManyByUserProfileId(profile.id, {
        includeArchived: Boolean(query.includeArchived),
        type: query.type,
        accountId: query.accountId,
        categoryId: query.categoryId,
        fromAccountId: query.fromAccountId,
        toAccountId: query.toAccountId,
        startDate: startDate,
        endDate: endDate,
        search: query.search,
    })

    const totalPages = Math.ceil(total / query.pageSize)

    return {
        items: items.map(serializeTransaction),
        meta: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages,
        },
    }
}

export async function createTransaction(authUser: AuthUser, input: CreateTransactionInput) {
    const profile = await getOrCreateUserProfile(authUser)

    // Type-specific validations
    if (input.type === 'INCOME' || input.type === 'EXPENSE') {
        if (!input.accountId)
            throw new AppError('VALIDATION_ERROR', 'Income transactions require an account.', 422)
        await ensureAccountOwned(input.accountId, profile.id)
        if (input.categoryId) await ensureCategoryOwned(input.categoryId, profile.id)
        if (input.amount <= 0)
            throw new AppError('VALIDATION_ERROR', 'Amount must be greater than 0', 422)
    }

    if (input.type === 'TRANSFER') {
        if (!input.fromAccountId || !input.toAccountId)
            throw new AppError(
                'VALIDATION_ERROR',
                'Transfer transactions require both fromAccountId and toAccountId.',
                422,
            )
        if (input.fromAccountId === input.toAccountId)
            throw new AppError('VALIDATION_ERROR', 'Transfer accounts must be different.', 422)
        await ensureAccountOwned(input.fromAccountId, profile.id)
        await ensureAccountOwned(input.toAccountId, profile.id)
        if (input.amount <= 0)
            throw new AppError('VALIDATION_ERROR', 'Amount must be greater than 0', 422)
    }

    if (input.type === 'ADJUSTMENT') {
        if (!input.accountId)
            throw new AppError(
                'VALIDATION_ERROR',
                'Adjustment transactions require an account.',
                422,
            )
        await ensureAccountOwned(input.accountId, profile.id)
        // amount may be negative, zero, or positive
    }

    // Normalize fields for storage
    const data: Prisma.TransactionUncheckedCreateInput = {
        type: input.type,
        amount: input.amount,
        date: new Date(input.date),
        merchant: (input as { merchant?: string | null }).merchant ?? null,
        note: input.note ?? null,
        userProfileId: profile.id,
    }

    if (input.type === 'TRANSFER') {
        data.fromAccountId = input.fromAccountId
        data.toAccountId = input.toAccountId
        data.accountId = null
        data.categoryId = null
    } else {
        data.accountId = (input as { accountId?: string | null }).accountId ?? null
        data.categoryId = (input as { categoryId?: string | null }).categoryId ?? null
        data.fromAccountId = null
        data.toAccountId = null
    }

    const created = await createForUser(profile.id, data)
    return serializeTransaction(created)
}

export async function getTransactionById(authUser: AuthUser, id: string) {
    const profile = await getOrCreateUserProfile(authUser)
    const tx = await findByIdForUser(id, profile.id)
    if (!tx) throw new AppError('NOT_FOUND', 'Transaction not found', 404)
    return serializeTransaction(tx)
}

export async function updateTransaction(
    authUser: AuthUser,
    id: string,
    input: UpdateTransactionInput,
) {
    const profile = await getOrCreateUserProfile(authUser)
    const existing = await findByIdForUser(id, profile.id)
    if (!existing) throw new AppError('NOT_FOUND', 'Transaction not found', 404)

    // If changing references, validate ownership
    if (input.accountId) await ensureAccountOwned(input.accountId, profile.id)
    if (input.fromAccountId) await ensureAccountOwned(input.fromAccountId, profile.id)
    if (input.toAccountId) await ensureAccountOwned(input.toAccountId, profile.id)
    if (input.categoryId) await ensureCategoryOwned(input.categoryId, profile.id)

    // Merge and normalize based on resulting type
    const resultingType = input.type ?? existing.type

    const data: Prisma.TransactionUncheckedUpdateInput = {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
        ...(input.merchant !== undefined ? { merchant: input.merchant } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
    }

    if (resultingType === 'TRANSFER') {
        const fromId = input.fromAccountId ?? existing.fromAccountId
        const toId = input.toAccountId ?? existing.toAccountId
        if (!fromId || !toId)
            throw new AppError(
                'VALIDATION_ERROR',
                'Transfer transactions require both fromAccountId and toAccountId.',
                422,
            )
        if (fromId === toId)
            throw new AppError('VALIDATION_ERROR', 'Transfer accounts must be different.', 422)
        data.fromAccountId = fromId
        data.toAccountId = toId
        data.accountId = null
        data.categoryId = null
    } else {
        const acctId =
            (input.accountId !== undefined ? input.accountId : existing.accountId) ?? null
        data.accountId = acctId
        data.fromAccountId = null
        data.toAccountId = null
        // category allowed for income/expense
        if (resultingType === 'INCOME' || resultingType === 'EXPENSE') {
            data.categoryId =
                input.categoryId !== undefined ? input.categoryId : existing.categoryId
        } else {
            data.categoryId = null
        }
    }

    if (input.type !== undefined) data.type = input.type

    // Validate amounts per type
    const amountToCheck = input.amount !== undefined ? input.amount : Number(existing.amount)
    if (resultingType === 'INCOME' || resultingType === 'EXPENSE' || resultingType === 'TRANSFER') {
        if (amountToCheck <= 0)
            throw new AppError('VALIDATION_ERROR', 'Amount must be greater than 0', 422)
    }

    const updated = await updateForUser(id, profile.id, data)
    if (!updated) throw new AppError('NOT_FOUND', 'Transaction not found', 404)
    return serializeTransaction(updated)
}

export async function archiveTransaction(authUser: AuthUser, id: string) {
    const profile = await getOrCreateUserProfile(authUser)
    const existing = await findByIdForUser(id, profile.id)
    if (!existing) throw new AppError('NOT_FOUND', 'Transaction not found', 404)

    const archived = await archiveForUser(id, profile.id)
    if (!archived) throw new AppError('NOT_FOUND', 'Transaction not found', 404)
    return serializeTransaction(archived)
}
