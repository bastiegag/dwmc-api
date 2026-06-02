import { z } from 'zod'
import { paginationSchema } from '../../shared/validation/pagination.js'

const queryBooleanSchema = z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true')

export const createSectionSchema = z.object({
    name: z.string().trim().min(1).max(80),
    color: z.string().trim().min(1).max(40),
})

export const updateSectionSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    color: z.string().trim().min(1).max(40).optional(),
    isArchived: z.boolean().optional(),
})

export const sectionParamsSchema = z.object({
    id: z.string().min(1),
})

export const getSectionsQuerySchema = z
    .object({
        includeArchived: queryBooleanSchema,
        includeCategories: queryBooleanSchema,
    })
    .merge(paginationSchema)

export type CreateSectionInput = z.infer<typeof createSectionSchema>
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>
export type SectionParamsInput = z.infer<typeof sectionParamsSchema>
export type GetSectionsQueryInput = z.infer<typeof getSectionsQuerySchema>
