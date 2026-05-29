import { z } from 'zod'

export const categoryTypeSchema = z.enum(['INCOME', 'EXPENSE'])

const trimmedNameSchema = z.string().trim().min(1).max(80)

const includeArchivedSchema = z.enum(['true', 'false']).transform((value) => value === 'true')

export const createCategorySchema = z.object({
  name: trimmedNameSchema,
  type: categoryTypeSchema,
  color: z.string().max(40).optional(),
  icon: z.string().max(80).optional(),
  parentId: z.string().nullable().optional(),
})

export const updateCategorySchema = z.object({
  name: trimmedNameSchema.optional(),
  type: categoryTypeSchema.optional(),
  color: z.string().max(40).nullable().optional(),
  icon: z.string().max(80).nullable().optional(),
  parentId: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
})

export const categoryParamsSchema = z.object({
  id: z.string(),
})

export const getCategoriesQuerySchema = z.object({
  type: categoryTypeSchema.optional(),
  includeArchived: includeArchivedSchema.optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type GetCategoriesQueryInput = z.infer<typeof getCategoriesQuerySchema>
