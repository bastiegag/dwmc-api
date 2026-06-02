import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { paginatedResponse, successResponse } from '../../shared/http/api-response.js'
import { parseOrThrow, validateBody } from '../../shared/validation/validate.js'
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

categoryRoutes.get('/', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const query = parseOrThrow(getCategoriesQuerySchema, c.req.query())
  const result = await listCategories(authUser, query)

  return c.json(paginatedResponse(result.items, result.nextCursor))
})

categoryRoutes.post('/', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const input = await validateBody(c, createCategorySchema)

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
  const input = await validateBody(c, updateCategorySchema)

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
