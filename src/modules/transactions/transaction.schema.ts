import { z } from 'zod'

const queryBooleanSchema = z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true')

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT'])

export const transactionDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
        (value) => {
            const [year = NaN, month = NaN, day = NaN] = value.split('-').map(Number)
            const date = new Date(Date.UTC(year, month - 1, day))
            return (
                date.getUTCFullYear() === year &&
                date.getUTCMonth() === month - 1 &&
                date.getUTCDate() === day
            )
        },
        { message: 'Date must be a valid calendar date in YYYY-MM-DD format' },
    )

const merchantSchema = z.string().trim().max(120).nullable().optional()
const noteSchema = z.string().trim().max(500).nullable().optional()

const incomeSchema = z.object({
    type: z.literal('INCOME'),
    amount: z.coerce.number().refine((n) => n > 0, { message: 'Amount must be greater than 0' }),
    date: transactionDateSchema,
    accountId: z.string().min(1),
    categoryId: z.string().min(1).nullable().optional(),
    merchant: merchantSchema,
    note: noteSchema,
})

const expenseSchema = z.object({
    type: z.literal('EXPENSE'),
    amount: z.coerce.number().refine((n) => n > 0, { message: 'Amount must be greater than 0' }),
    date: transactionDateSchema,
    accountId: z.string().min(1),
    categoryId: z.string().min(1).nullable().optional(),
    merchant: merchantSchema,
    note: noteSchema,
})

const transferSchema = z.object({
    type: z.literal('TRANSFER'),
    amount: z.coerce.number().refine((n) => n > 0, { message: 'Amount must be greater than 0' }),
    date: transactionDateSchema,
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    note: noteSchema,
})

const adjustmentSchema = z.object({
    type: z.literal('ADJUSTMENT'),
    amount: z.coerce.number(),
    date: transactionDateSchema,
    accountId: z.string().min(1),
    note: noteSchema,
})

export const createTransactionSchema = z.discriminatedUnion('type', [
    incomeSchema,
    expenseSchema,
    transferSchema,
    adjustmentSchema,
])

export const updateTransactionSchema = z.object({
    type: transactionTypeSchema.optional(),
    amount: z.coerce.number().optional(),
    date: transactionDateSchema.optional(),
    accountId: z.string().min(1).optional().nullable(),
    fromAccountId: z.string().min(1).optional().nullable(),
    toAccountId: z.string().min(1).optional().nullable(),
    categoryId: z.string().min(1).optional().nullable(),
    merchant: merchantSchema,
    note: noteSchema,
    isArchived: z.boolean().optional(),
})

export const transactionParamsSchema = z.object({ id: z.string().min(1) })

export const getTransactionsQuerySchema = z.object({
    type: transactionTypeSchema.optional(),
    accountId: z.string().min(1).optional(),
    categoryId: z.string().min(1).optional(),
    fromAccountId: z.string().min(1).optional(),
    toAccountId: z.string().min(1).optional(),
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .refine((value) => {
            const month = Number(value.slice(5))
            return month >= 1 && month <= 12
        }, 'Month must be a valid calendar month')
        .optional(),
    startDate: transactionDateSchema.optional(),
    endDate: transactionDateSchema.optional(),
    search: z.string().trim().max(120).optional(),
    includeArchived: queryBooleanSchema,
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(25),
})

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransactionParamsInput = z.infer<typeof transactionParamsSchema>
export type GetTransactionsQueryInput = z.infer<typeof getTransactionsQuerySchema>
