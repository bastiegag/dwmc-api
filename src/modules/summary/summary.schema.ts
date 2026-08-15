import { z } from 'zod'

export const getMonthlySummaryQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must be a valid calendar month')
        .optional(),
    recentLimit: z.coerce.number().int().positive().max(20).default(5),
})

export type GetMonthlySummaryQueryInput = z.infer<typeof getMonthlySummaryQuerySchema>
