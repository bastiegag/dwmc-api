import type { AuthUser } from '../../types/app.js'
import { Prisma, type Prisma as PrismaTypes } from '@prisma/client'
import { AppError } from '../../shared/errors/AppError.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import { fromCents, toCents } from '../../shared/money/decimal.js'
import {
    findManyByUserProfileId,
    findByIdForUser,
    createForUser,
    updateForUser,
    archiveForUser,
    findDuplicateByCategoryAndMonth,
    findExpenseTotalsByCategoryForMonth,
} from './budget.repository.js'
import { findByIdForUser as findCategoryByIdForUser } from '../categories/category.repository.js'
import type { CreateBudgetInput, UpdateBudgetInput, GetBudgetsQueryInput } from './budget.schema.js'

const monthToRange = (month: string) => {
    const [yStr, mStr] = month.split('-')
    const y = Number(yStr)
    const m = Number(mStr)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const next = new Date(Date.UTC(y, m, 1))
    return { startIso: start.toISOString(), nextIso: next.toISOString() }
}

const computeProgress = (amountCents: bigint, spentCents: bigint) => {
    if (amountCents === 0n) return spentCents === 0n ? 0 : 100
    return (Number(spentCents) / Number(amountCents)) * 100
}

type BudgetWithCategory = PrismaTypes.BudgetGetPayload<{
    include: {
        category: {
            select: {
                id: true
                name: true
                icon: true
                sectionId: true
                section: { select: { id: true; name: true; color: true } }
            }
        }
    }
}>

type ExpenseAgg = {
    categoryId: string | null
    _sum: { amount: PrismaTypes.Decimal | number | null }
    _count: { id: number }
}

const serializeBudgetRecord = (budget: BudgetWithCategory, spentCents = 0n, count = 0) => {
    const amountCents = toCents(budget.amount as unknown as PrismaTypes.Decimal | number | string)
    const remainingCents = amountCents - spentCents
    const progress = Number(Number(computeProgress(amountCents, spentCents)).toFixed(6))
    return {
        id: budget.id,
        month: budget.month,
        amount: fromCents(amountCents),
        spent: fromCents(spentCents),
        remaining: fromCents(remainingCents),
        progress,
        isOverBudget: spentCents > amountCents,
        transactionCount: count,
        isArchived: budget.isArchived as boolean,
        createdAt: toIso(budget.createdAt),
        updatedAt: toIso(budget.updatedAt),
        category: budget.category ?? null,
    }
}

const isUniqueConstraintError = (error: unknown) => {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

const toIso = (d: unknown) => {
    const hasIso = d && typeof (d as { toISOString?: unknown }).toISOString === 'function'
    return hasIso
        ? (d as { toISOString: () => string }).toISOString()
        : new Date(String(d)).toISOString()
}

export const listBudgets = async (authUser: AuthUser, query: GetBudgetsQueryInput) => {
    const profile = await getOrCreateUserProfile(authUser)

    if (query.categoryId) {
        const cat = await findCategoryByIdForUser(query.categoryId, profile.id)
        if (!cat) throw new AppError('NOT_FOUND', 'Category not found', 404)
    }

    let month = query.month
    if (!month) {
        const now = new Date()
        month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    }

    const budgets = await findManyByUserProfileId(profile.id, {
        month,
        categoryId: query.categoryId,
        includeArchived: Boolean(query.includeArchived),
    })

    const { startIso, nextIso } = monthToRange(month)
    const aggs = (await findExpenseTotalsByCategoryForMonth(
        profile.id,
        startIso,
        nextIso,
    )) as ExpenseAgg[]
    const map = new Map<string, { sumCents: bigint; count: number }>()
    for (const a of aggs) {
        const catId = a.categoryId
        if (!catId) continue
        map.set(catId, { sumCents: toCents(a._sum.amount ?? 0), count: a._count.id })
    }

    return budgets.map((b) => {
        const found = map.get(b.categoryId) ?? { sumCents: 0n, count: 0 }
        return serializeBudgetRecord(b, found.sumCents, found.count)
    })
}

export const createBudget = async (authUser: AuthUser, input: CreateBudgetInput) => {
    const profile = await getOrCreateUserProfile(authUser)

    const cat = await findCategoryByIdForUser(input.categoryId, profile.id)
    if (!cat) throw new AppError('NOT_FOUND', 'Category not found', 404)
    if (cat.isArchived) {
        throw new AppError(
            'VALIDATION_ERROR',
            'Archived categories cannot receive new budgets.',
            422,
        )
    }

    const dup = await findDuplicateByCategoryAndMonth(profile.id, input.categoryId, input.month)
    if (dup)
        throw new AppError('CONFLICT', 'A budget already exists for this category and month.', 409)

    let created: BudgetWithCategory
    try {
        created = await createForUser(profile.id, {
            categoryId: input.categoryId,
            month: input.month,
            amount: input.amount,
        } as PrismaTypes.BudgetUncheckedCreateInput)
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new AppError(
                'CONFLICT',
                'A budget already exists for this category and month.',
                409,
            )
        }
        throw error
    }

    const { startIso, nextIso } = monthToRange(input.month)
    const aggs = (await findExpenseTotalsByCategoryForMonth(
        profile.id,
        startIso,
        nextIso,
    )) as ExpenseAgg[]
    const found = aggs.find((a) => a.categoryId === created.categoryId)
    const spentCents = found ? toCents(found._sum.amount ?? 0) : 0n
    const count = found ? found._count.id : 0

    return serializeBudgetRecord(created, spentCents, count)
}

export const getBudgetById = async (authUser: AuthUser, id: string) => {
    const profile = await getOrCreateUserProfile(authUser)

    const b = await findByIdForUser(id, profile.id)
    if (!b) throw new AppError('NOT_FOUND', 'Budget not found', 404)

    const { startIso, nextIso } = monthToRange(b.month)
    const aggs = (await findExpenseTotalsByCategoryForMonth(
        profile.id,
        startIso,
        nextIso,
    )) as ExpenseAgg[]
    const found = aggs.find((a) => a.categoryId === b.categoryId)
    const spentCents = found ? toCents(found._sum.amount ?? 0) : 0n
    const count = found ? found._count.id : 0

    return serializeBudgetRecord(b, spentCents, count)
}

export const updateBudget = async (authUser: AuthUser, id: string, input: UpdateBudgetInput) => {
    const profile = await getOrCreateUserProfile(authUser)

    const existing = await findByIdForUser(id, profile.id)
    if (!existing) throw new AppError('NOT_FOUND', 'Budget not found', 404)

    const newCategoryId = input.categoryId ?? existing.categoryId
    const newMonth = input.month ?? existing.month

    if (input.categoryId) {
        const cat = await findCategoryByIdForUser(input.categoryId, profile.id)
        if (!cat) throw new AppError('NOT_FOUND', 'Category not found', 404)
        if (cat.isArchived && input.categoryId !== existing.categoryId) {
            throw new AppError(
                'VALIDATION_ERROR',
                'Archived categories cannot receive new budgets.',
                422,
            )
        }
    }

    if (newCategoryId !== existing.categoryId || newMonth !== existing.month) {
        const dup = await findDuplicateByCategoryAndMonth(profile.id, newCategoryId, newMonth, id)
        if (dup)
            throw new AppError(
                'CONFLICT',
                'A budget already exists for this category and month.',
                409,
            )
    }

    let updated: BudgetWithCategory | null
    try {
        updated = await updateForUser(id, profile.id, input as PrismaTypes.BudgetUpdateInput)
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new AppError(
                'CONFLICT',
                'A budget already exists for this category and month.',
                409,
            )
        }
        throw error
    }
    if (!updated) throw new AppError('NOT_FOUND', 'Budget not found', 404)

    const { startIso, nextIso } = monthToRange(updated.month)
    const aggs = (await findExpenseTotalsByCategoryForMonth(
        profile.id,
        startIso,
        nextIso,
    )) as ExpenseAgg[]
    const found = aggs.find((a) => a.categoryId === updated.categoryId)
    const spentCents = found ? toCents(found._sum.amount ?? 0) : 0n
    const count = found ? found._count.id : 0

    return serializeBudgetRecord(updated, spentCents, count)
}

export const archiveBudget = async (authUser: AuthUser, id: string) => {
    const profile = await getOrCreateUserProfile(authUser)

    const archived = await archiveForUser(id, profile.id)
    if (!archived) throw new AppError('NOT_FOUND', 'Budget not found', 404)

    const { startIso, nextIso } = monthToRange(archived.month)
    const aggs = (await findExpenseTotalsByCategoryForMonth(
        profile.id,
        startIso,
        nextIso,
    )) as ExpenseAgg[]
    const found = aggs.find((a) => a.categoryId === archived.categoryId)
    const spentCents = found ? toCents(found._sum.amount ?? 0) : 0n
    const count = found ? found._count.id : 0

    return serializeBudgetRecord(archived, spentCents, count)
}

export default {}
