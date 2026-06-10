import { z } from 'zod'

const queryBooleanSchema = z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true')

export const createBudgetSchema = z.object({
    categoryId: z.string().min(1),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    amount: z.coerce.number().min(0),
})

export const updateBudgetSchema = z.object({
    categoryId: z.string().min(1).optional(),
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    amount: z.coerce.number().min(0).optional(),
    isArchived: z.boolean().optional(),
})

export const budgetParamsSchema = z.object({ id: z.string().min(1) })

export const getBudgetsQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    categoryId: z.string().min(1).optional(),
    includeArchived: queryBooleanSchema,
})

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>
export type BudgetParamsInput = z.infer<typeof budgetParamsSchema>
export type GetBudgetsQueryInput = z.infer<typeof getBudgetsQuerySchema>

export default {}
