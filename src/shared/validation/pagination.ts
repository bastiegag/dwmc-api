import { z } from 'zod'

export const paginationSchema = z.object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type PaginationInput = z.infer<typeof paginationSchema>
