import { z } from 'zod'
import { paginationSchema } from '../../shared/validation/pagination.js'

const queryBooleanSchema = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true')

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  icon: z.string().trim().min(1).max(80),
  sectionId: z.string().min(1),
})

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  icon: z.string().trim().min(1).max(80).optional(),
  sectionId: z.string().min(1).optional(),
  isArchived: z.boolean().optional(),
})

export const categoryParamsSchema = z.object({
  id: z.string().min(1),
})

export const getCategoriesQuerySchema = z
  .object({
    includeArchived: queryBooleanSchema,
    sectionId: z.string().min(1).optional(),
  })
  .merge(paginationSchema)

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type CategoryParamsInput = z.infer<typeof categoryParamsSchema>
export type GetCategoriesQueryInput = z.infer<typeof getCategoriesQuerySchema>
