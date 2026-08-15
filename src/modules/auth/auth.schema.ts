import { z } from 'zod'

/** Shape of the authenticated user attached to the Hono context by authMiddleware. */
export const authUserSchema = z.object({
    id: z.string(),
    email: z.string().email().optional(),
})

/** Shape of the UserProfile returned in API responses. */
export const userProfileResponseSchema = z.object({
    id: z.string(),
    authUserId: z.string(),
    email: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
    preferredCurrency: z.string(),
    currency: z.string().optional(),
    locale: z.string(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
})
