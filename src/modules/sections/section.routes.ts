import { Hono } from 'hono'
import type { ZodType, ZodTypeDef } from 'zod'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { AppError } from '../../shared/errors/AppError.js'
import { successResponse } from '../../shared/http/api-response.js'
import {
  createSectionSchema,
  getSectionsQuerySchema,
  sectionParamsSchema,
  updateSectionSchema,
} from './section.schema.js'
import {
  archiveSection,
  createSection,
  getSectionById,
  listSections,
  updateSection,
} from './section.service.js'

const sectionRoutes = new Hono<AppBindings>()

function parseOrThrow<T>(schema: ZodType<T, ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Validation failed', 400, result.error.flatten())
  }

  return result.data
}

sectionRoutes.get('/', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const query = parseOrThrow(getSectionsQuerySchema, c.req.query())
  const sections = await listSections(authUser, query)

  return c.json(successResponse(sections))
})

sectionRoutes.post('/', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const body = await c.req.json().catch(() => {
    throw new AppError('VALIDATION_ERROR', 'Invalid JSON body', 400)
  })
  const input = parseOrThrow(createSectionSchema, body)

  const section = await createSection(authUser, input)
  return c.json(successResponse(section), 201)
})

sectionRoutes.get('/:id', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const params = parseOrThrow(sectionParamsSchema, c.req.param())
  const query = parseOrThrow(getSectionsQuerySchema.pick({ includeCategories: true }), c.req.query())

  const section = await getSectionById(authUser, params.id, query.includeCategories)
  return c.json(successResponse(section))
})

sectionRoutes.patch('/:id', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const params = parseOrThrow(sectionParamsSchema, c.req.param())
  const body = await c.req.json().catch(() => {
    throw new AppError('VALIDATION_ERROR', 'Invalid JSON body', 400)
  })
  const input = parseOrThrow(updateSectionSchema, body)

  const section = await updateSection(authUser, params.id, input)
  return c.json(successResponse(section))
})

sectionRoutes.delete('/:id', authMiddleware, async (c) => {
  const authUser = c.get('authUser')
  const params = parseOrThrow(sectionParamsSchema, c.req.param())

  const section = await archiveSection(authUser, params.id)
  return c.json(successResponse(section))
})

export { sectionRoutes }
