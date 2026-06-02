import { Hono } from 'hono'
import type { AppBindings } from '../../types/app.js'
import { authMiddleware } from '../auth/auth.middleware.js'
import { paginatedResponse, successResponse } from '../../shared/http/api-response.js'
import { parseOrThrow, validateBody } from '../../shared/validation/validate.js'
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

sectionRoutes.get('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const query = parseOrThrow(getSectionsQuerySchema, c.req.query())
    const result = await listSections(authUser, query)

    return c.json(paginatedResponse(result.items, result.nextCursor))
})

sectionRoutes.post('/', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const input = await validateBody(c, createSectionSchema)

    const section = await createSection(authUser, input)
    return c.json(successResponse(section), 201)
})

sectionRoutes.get('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(sectionParamsSchema, c.req.param())
    const query = parseOrThrow(
        getSectionsQuerySchema.pick({ includeCategories: true }),
        c.req.query(),
    )

    const section = await getSectionById(authUser, params.id, query.includeCategories)
    return c.json(successResponse(section))
})

sectionRoutes.patch('/:id', authMiddleware, async (c) => {
    const authUser = c.get('authUser')
    const params = parseOrThrow(sectionParamsSchema, c.req.param())
    const input = await validateBody(c, updateSectionSchema)

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
