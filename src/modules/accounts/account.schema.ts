import { z } from 'zod'

const queryBooleanSchema = z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true')

export const accountTypeSchema = z.enum([
    'CHECKING',
    'SAVINGS',
    'CREDIT_CARD',
    'CASH',
    'INVESTMENT',
    'LOAN',
    'OTHER',
])

export const createAccountSchema = z.object({
    name: z.string().trim().min(1).max(80),
    type: accountTypeSchema.optional(),
    startingBalance: z.coerce.number().optional(),
    goal: z.coerce.number().nullable().optional(),
    color: z.string().trim().min(1).max(40),
    icon: z.string().trim().min(1).max(80),
})

export const updateAccountSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    type: accountTypeSchema.optional(),
    startingBalance: z.coerce.number().optional(),
    goal: z.coerce.number().nullable().optional(),
    color: z.string().trim().min(1).max(40).optional(),
    icon: z.string().trim().min(1).max(80).optional(),
    isArchived: z.boolean().optional(),
})

export const accountParamsSchema = z.object({
    id: z.string().min(1),
})

export const getAccountsQuerySchema = z.object({
    type: accountTypeSchema.optional(),
    includeArchived: queryBooleanSchema,
})

export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type AccountParamsInput = z.infer<typeof accountParamsSchema>
export type GetAccountsQueryInput = z.infer<typeof getAccountsQuerySchema>
