import { z } from 'zod'

const monthSchema = z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must use YYYY-MM format')
    .refine((value) => {
        const month = Number(value.slice(5))
        return month >= 1 && month <= 12
    }, 'Month must be a valid calendar month')

const queryBooleanSchema = z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true')

export const createBudgetSchema = z.object({
    categoryId: z.string().min(1),
    month: monthSchema,
    amount: z.coerce.number().min(0),
})

export const updateBudgetSchema = z.object({
    categoryId: z.string().min(1).optional(),
    month: monthSchema.optional(),
    amount: z.coerce.number().min(0).optional(),
    isArchived: z.boolean().optional(),
})

export const budgetParamsSchema = z.object({ id: z.string().min(1) })

export const getBudgetsQuerySchema = z.object({
    month: monthSchema.optional(),
    categoryId: z.string().min(1).optional(),
    includeArchived: queryBooleanSchema,
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>
export type BudgetParamsInput = z.infer<typeof budgetParamsSchema>
export type GetBudgetsQueryInput = z.infer<typeof getBudgetsQuerySchema>

export default {}
