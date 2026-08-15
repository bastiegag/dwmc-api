import type { AuthUser } from '../../types/app.js'
import type { Prisma } from '@prisma/client'
import { AppError } from '../../shared/errors/AppError.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import { serializeDecimal } from '../../shared/money/decimal.js'
import { getUtcMonthRange } from '../../shared/date/month.js'
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
import type { TransactionWithRelations } from './transaction.repository.js'
import type {
    CreateTransactionInput,
    GetTransactionsQueryInput,
    UpdateTransactionInput,
} from './transaction.schema.js'

type TransactionKind = CreateTransactionInput['type']

type SerializedTransaction = {
    id: string
    type: TransactionWithRelations['type']
    amount: number
    date: string
    merchant: string | null
    note: string | null
    accountId: string | null
    fromAccountId: string | null
    toAccountId: string | null
    categoryId: string | null
    isArchived: boolean
    createdAt: string
    updatedAt: string
    account: TransactionWithRelations['account']
    fromAccount: TransactionWithRelations['fromAccount']
    toAccount: TransactionWithRelations['toAccount']
    category: TransactionWithRelations['category']
}

const serializeTransaction = (tx: TransactionWithRelations): SerializedTransaction => {
    const toIso = (value: Date | string | number) => {
        return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
    }

    return {
        id: tx.id,
        type: tx.type,
        amount: serializeDecimal(tx.amount),
        date: toIso(tx.date),
        merchant: tx.merchant,
        note: tx.note,
        accountId: tx.accountId,
        fromAccountId: tx.fromAccountId,
        toAccountId: tx.toAccountId,
        categoryId: tx.categoryId,
        isArchived: tx.isArchived,
        createdAt: toIso(tx.createdAt),
        updatedAt: toIso(tx.updatedAt),
        account: tx.account,
        fromAccount: tx.fromAccount,
        toAccount: tx.toAccount,
        category: tx.category,
    }
}

const ensureAccountOwned = async (
    accountId: string | undefined,
    userProfileId: string,
    allowArchived = false,
) => {
    if (!accountId) return null
    const acct = await findAccountByIdForUser(accountId, userProfileId)
    if (!acct) throw new AppError('NOT_FOUND', 'Account not found', 404)
    if (acct.isArchived && !allowArchived) {
        throw new AppError(
            'VALIDATION_ERROR',
            'Archived accounts cannot receive new transactions.',
            422,
        )
    }
    return acct
}

const ensureCategoryOwned = async (
    categoryId: string | undefined,
    userProfileId: string,
    allowArchived = false,
) => {
    if (!categoryId) return null
    const cat = await findCategoryByIdForUser(categoryId, userProfileId)
    if (!cat) throw new AppError('NOT_FOUND', 'Category not found', 404)
    if (cat.isArchived && !allowArchived) {
        throw new AppError(
            'VALIDATION_ERROR',
            'Archived categories cannot receive new transactions.',
            422,
        )
    }
    return cat
}

const isMonetaryTransaction = (type: TransactionKind) => {
    return type === 'INCOME' || type === 'EXPENSE' || type === 'TRANSFER'
}

const ensurePositiveAmount = (amount: number) => {
    if (amount <= 0) throw new AppError('VALIDATION_ERROR', 'Amount must be greater than 0', 422)
}

const applyCreateRelationFields = (
    data: Prisma.TransactionUncheckedCreateInput,
    input: CreateTransactionInput,
) => {
    if (input.type === 'TRANSFER') {
        data.fromAccountId = input.fromAccountId
        data.toAccountId = input.toAccountId
        data.accountId = null
        data.categoryId = null
        return
    }

    data.accountId = input.accountId ?? null
    data.categoryId = 'categoryId' in input ? (input.categoryId ?? null) : null
    data.fromAccountId = null
    data.toAccountId = null
}

const applyUpdateRelationFields = (
    data: Prisma.TransactionUncheckedUpdateInput,
    input: UpdateTransactionInput,
    existing: TransactionWithRelations,
    resultingType: TransactionKind,
) => {
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
        return
    }

    data.accountId = (input.accountId !== undefined ? input.accountId : existing.accountId) ?? null
    data.fromAccountId = null
    data.toAccountId = null

    if (resultingType === 'INCOME' || resultingType === 'EXPENSE') {
        data.categoryId = input.categoryId !== undefined ? input.categoryId : existing.categoryId
        return
    }

    data.categoryId = null
}

export const listTransactions = async (authUser: AuthUser, query: GetTransactionsQueryInput) => {
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
        const { start, next } = getUtcMonthRange(query.month)
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

export const createTransaction = async (authUser: AuthUser, input: CreateTransactionInput) => {
    const profile = await getOrCreateUserProfile(authUser)

    // Type-specific validations
    if (input.type === 'INCOME' || input.type === 'EXPENSE') {
        if (!input.accountId)
            throw new AppError('VALIDATION_ERROR', 'Income transactions require an account.', 422)
        await ensureAccountOwned(input.accountId, profile.id)
        if (input.categoryId) await ensureCategoryOwned(input.categoryId, profile.id)
        ensurePositiveAmount(input.amount)
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
        ensurePositiveAmount(input.amount)
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
        merchant: 'merchant' in input ? (input.merchant ?? null) : null,
        note: input.note ?? null,
        userProfileId: profile.id,
    }

    applyCreateRelationFields(data, input)

    const created = await createForUser(profile.id, data)
    return serializeTransaction(created)
}

export const getTransactionById = async (authUser: AuthUser, id: string) => {
    const profile = await getOrCreateUserProfile(authUser)
    const tx = await findByIdForUser(id, profile.id)
    if (!tx) throw new AppError('NOT_FOUND', 'Transaction not found', 404)
    return serializeTransaction(tx)
}

export const updateTransaction = async (
    authUser: AuthUser,
    id: string,
    input: UpdateTransactionInput,
) => {
    const profile = await getOrCreateUserProfile(authUser)
    const existing = await findByIdForUser(id, profile.id)
    if (!existing) throw new AppError('NOT_FOUND', 'Transaction not found', 404)

    // If changing references, validate ownership
    if (input.accountId)
        await ensureAccountOwned(
            input.accountId,
            profile.id,
            input.accountId === existing.accountId,
        )
    if (input.fromAccountId)
        await ensureAccountOwned(
            input.fromAccountId,
            profile.id,
            input.fromAccountId === existing.fromAccountId,
        )
    if (input.toAccountId)
        await ensureAccountOwned(
            input.toAccountId,
            profile.id,
            input.toAccountId === existing.toAccountId,
        )
    if (input.categoryId)
        await ensureCategoryOwned(
            input.categoryId,
            profile.id,
            input.categoryId === existing.categoryId,
        )

    // Merge and normalize based on resulting type
    const resultingType = input.type ?? existing.type

    const data: Prisma.TransactionUncheckedUpdateInput = {
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
        ...(input.merchant !== undefined ? { merchant: input.merchant } : {}),
        ...(input.note !== undefined ? { note: input.note } : {}),
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
    }

    applyUpdateRelationFields(data, input, existing, resultingType)

    if (
        resultingType === 'INCOME' ||
        resultingType === 'EXPENSE' ||
        resultingType === 'ADJUSTMENT'
    ) {
        const accountId = input.accountId !== undefined ? input.accountId : existing.accountId
        if (!accountId) {
            throw new AppError(
                'VALIDATION_ERROR',
                `${resultingType} transactions require an account.`,
                422,
            )
        }
    }

    if (input.type !== undefined) data.type = input.type

    // Validate amounts per type
    const amountToCheck = input.amount !== undefined ? input.amount : Number(existing.amount)
    if (isMonetaryTransaction(resultingType)) ensurePositiveAmount(amountToCheck)

    const updated = await updateForUser(id, profile.id, data)
    if (!updated) throw new AppError('NOT_FOUND', 'Transaction not found', 404)
    return serializeTransaction(updated)
}

export const archiveTransaction = async (authUser: AuthUser, id: string) => {
    const profile = await getOrCreateUserProfile(authUser)

    const archived = await archiveForUser(id, profile.id)
    if (!archived) throw new AppError('NOT_FOUND', 'Transaction not found', 404)
    return serializeTransaction(archived)
}
