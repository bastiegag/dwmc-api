import { z } from 'zod'

export const getMonthlySummaryQuerySchema = z.object({
    month: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    recentLimit: z.coerce.number().int().positive().max(20).default(5),
})

export type GetMonthlySummaryQueryInput = z.infer<typeof getMonthlySummaryQuerySchema>
