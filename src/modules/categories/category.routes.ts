import { Hono } from 'hono'
import type { ZodType, ZodTypeDef } from 'zod'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { AppError } from '../../shared/errors/AppError.js'
import { successResponse } from '../../shared/http/api-response.js'
import {
  categoryParamsSchema,
  createCategorySchema,
  getCategoriesQuerySchema,
  updateCategorySchema,
} from './category.schema.js'
import {
  archiveCategory,
  createCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from './category.service.js'

const categoryRoutes = new Hono<AppBindings>()

function parseOrThrow<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Validation failed', 400, result.error.flatten())
  }

  return result.data
}

categoryRoutes.get('/', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const query = parseOrThrow(getCategoriesQuerySchema, c.req.query())
  const categories = await listCategories(authUser, query)

  return c.json(successResponse(categories))
})

categoryRoutes.post('/', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const body = await c.req.json().catch(() => {
    throw new AppError('VALIDATION_ERROR', 'Invalid JSON body', 400)
  })
  const input = parseOrThrow(createCategorySchema, body)

  const category = await createCategory(authUser, input)
  return c.json(successResponse(category), 201)
})

categoryRoutes.get('/:id', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const params = parseOrThrow(categoryParamsSchema, c.req.param())

  const category = await getCategoryById(authUser, params.id)
  return c.json(successResponse(category))
})

categoryRoutes.patch('/:id', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const params = parseOrThrow(categoryParamsSchema, c.req.param())
  const body = await c.req.json().catch(() => {
    throw new AppError('VALIDATION_ERROR', 'Invalid JSON body', 400)
  })
  const input = parseOrThrow(updateCategorySchema, body)

  const category = await updateCategory(authUser, params.id, input)
  return c.json(successResponse(category))
})

categoryRoutes.delete('/:id', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const params = parseOrThrow(categoryParamsSchema, c.req.param())

  const category = await archiveCategory(authUser, params.id)
  return c.json(successResponse(category))
})

export { categoryRoutes }
