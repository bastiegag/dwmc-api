import type { AuthUser } from '../../types/app.js'
import type { Prisma } from '@prisma/client'
import { AppError } from '../../shared/errors/AppError.js'
import { getOrCreateUserProfile } from '../auth/auth.service.js'
import { serializeDecimal } from '../../shared/money/decimal.js'
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

function monthToRange(month: string) {
    const [yStr, mStr] = month.split('-')
    const y = Number(yStr)
    const m = Number(mStr)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const next = new Date(Date.UTC(y, m, 1))
    return { startIso: start.toISOString(), nextIso: next.toISOString() }
}

function computeProgress(amountNum: number, spentNum: number) {
    if (amountNum === 0) return spentNum === 0 ? 0 : 100
    return (spentNum / amountNum) * 100
}

type BudgetWithCategory = Prisma.BudgetGetPayload<{
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
    _sum: { amount: Prisma.Decimal | number | null }
    _count: { id: number }
}

function serializeBudgetRecord(budget: BudgetWithCategory, spent = 0, count = 0) {
    const amount = serializeDecimal(budget.amount as unknown as Prisma.Decimal | number | string)
    const spentNum = Number(spent)
    const remaining = amount - spentNum
    const progress = Number(Number(computeProgress(amount, spentNum)).toFixed(6))
    return {
        id: budget.id,
        month: budget.month,
        amount,
        spent: Number(spentNum),
        remaining: Number(remaining),
        progress,
        isOverBudget: spentNum > amount,
        transactionCount: count,
        isArchived: budget.isArchived as boolean,
        createdAt: toIso(budget.createdAt),
        updatedAt: toIso(budget.updatedAt),
        category: budget.category ?? null,
    }
}

function toIso(d: unknown) {
    const hasIso = d && typeof (d as { toISOString?: unknown }).toISOString === 'function'
    return hasIso
        ? (d as { toISOString: () => string }).toISOString()
        : new Date(String(d)).toISOString()
}

export async function listBudgets(authUser: AuthUser, query: GetBudgetsQueryInput) {
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
    const map = new Map<string, { sum: number; count: number }>()
    for (const a of aggs) {
        const catId = a.categoryId
        if (!catId) continue
        map.set(catId, { sum: Number(a._sum.amount ?? 0), count: a._count.id })
    }

    return budgets.map((b) => {
        const found = map.get(b.categoryId) ?? { sum: 0, count: 0 }
        return serializeBudgetRecord(b, found.sum, found.count)
    })
}

export async function createBudget(authUser: AuthUser, input: CreateBudgetInput) {
    const profile = await getOrCreateUserProfile(authUser)

    const cat = await findCategoryByIdForUser(input.categoryId, profile.id)
    if (!cat) throw new AppError('NOT_FOUND', 'Category not found', 404)

    const dup = await findDuplicateByCategoryAndMonth(profile.id, input.categoryId, input.month)
    if (dup)
        throw new AppError('CONFLICT', 'A budget already exists for this category and month.', 409)

    const created = await createForUser(profile.id, {
        categoryId: input.categoryId,
        month: input.month,
        amount: input.amount,
    } as Prisma.BudgetUncheckedCreateInput)

    const { startIso, nextIso } = monthToRange(input.month)
    const aggs = (await findExpenseTotalsByCategoryForMonth(
        profile.id,
        startIso,
        nextIso,
    )) as ExpenseAgg[]
    const found = aggs.find((a) => a.categoryId === created.categoryId)
    const spent = found ? Number(found._sum.amount ?? 0) : 0
    const count = found ? found._count.id : 0

    return serializeBudgetRecord(created, spent, count)
}

export async function getBudgetById(authUser: AuthUser, id: string) {
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
    const spent = found ? Number(found._sum.amount ?? 0) : 0
    const count = found ? found._count.id : 0

    return serializeBudgetRecord(b, spent, count)
}

export async function updateBudget(authUser: AuthUser, id: string, input: UpdateBudgetInput) {
    const profile = await getOrCreateUserProfile(authUser)

    const existing = await findByIdForUser(id, profile.id)
    if (!existing) throw new AppError('NOT_FOUND', 'Budget not found', 404)

    const newCategoryId = input.categoryId ?? existing.categoryId
    const newMonth = input.month ?? existing.month

    if (input.categoryId) {
        const cat = await findCategoryByIdForUser(input.categoryId, profile.id)
        if (!cat) throw new AppError('NOT_FOUND', 'Category not found', 404)
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

    const updated = await updateForUser(id, profile.id, input as Prisma.BudgetUpdateInput)
    if (!updated) throw new AppError('NOT_FOUND', 'Budget not found', 404)

    const { startIso, nextIso } = monthToRange(updated.month)
    const aggs = (await findExpenseTotalsByCategoryForMonth(
        profile.id,
        startIso,
        nextIso,
    )) as ExpenseAgg[]
    const found = aggs.find((a) => a.categoryId === updated.categoryId)
    const spent = found ? Number(found._sum.amount ?? 0) : 0
    const count = found ? found._count.id : 0

    return serializeBudgetRecord(updated, spent, count)
}

export async function archiveBudget(authUser: AuthUser, id: string) {
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
    const spent = found ? Number(found._sum.amount ?? 0) : 0
    const count = found ? found._count.id : 0

    return serializeBudgetRecord(archived, spent, count)
}

export default {}
