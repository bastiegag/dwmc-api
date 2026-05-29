import { Hono } from 'hono'
import type { ZodType, ZodTypeDef } from 'zod'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { validateBody } from '../../shared/validation/validate.js'
import { successResponse } from '../../shared/http/api-response.js'
import { AppError } from '../../shared/errors/AppError.js'
import {
  categoryParamsSchema,
  createCategorySchema,
  getCategoriesQuerySchema,
  updateCategorySchema,
} from './category.schema.js'
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  patchCategory,
} from './category.service.js'

const categoryRoutes = new Hono<AppBindings>()

function validateInput<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Validation failed', 422, result.error.flatten())
  }

  return result.data
}

categoryRoutes.use('*', authMiddleware)

categoryRoutes.get('/', async (c) => {
  const query = validateInput(getCategoriesQuerySchema, c.req.query())
  const categories = await listCategories(c.get('authUser').id, query)

  return c.json(successResponse(categories))
})

categoryRoutes.post('/', async (c) => {
  const body = await validateBody(c, createCategorySchema)
  const category = await createCategory(c.get('authUser').id, body)

  return c.json(successResponse(category), 201)
})

categoryRoutes.get('/:id', async (c) => {
  const params = validateInput(categoryParamsSchema, c.req.param())
  const category = await getCategoryById(c.get('authUser').id, params.id)

  return c.json(successResponse(category))
})

categoryRoutes.patch('/:id', async (c) => {
  const params = validateInput(categoryParamsSchema, c.req.param())
  const body = await validateBody(c, updateCategorySchema)
  const category = await patchCategory(c.get('authUser').id, params.id, body)

  return c.json(successResponse(category))
})

categoryRoutes.delete('/:id', async (c) => {
  const params = validateInput(categoryParamsSchema, c.req.param())
  const archivedCategory = await deleteCategory(c.get('authUser').id, params.id)

  return c.json(successResponse(archivedCategory))
})

export { categoryRoutes }
