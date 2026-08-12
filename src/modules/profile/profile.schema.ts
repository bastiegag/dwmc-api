import { z } from 'zod'

export const supportedCurrencySchema = z.enum(['CAD', 'USD', 'EUR'])

const optionalProfileText = z
    .string()
    .trim()
    .max(80)
    .transform((value) => value || null)
    .nullable()
    .optional()

export const updateProfileSchema = z
    .object({
        firstName: optionalProfileText,
        lastName: optionalProfileText,
        displayName: optionalProfileText,
        preferredCurrency: supportedCurrencySchema.optional(),
    })
    .strict()

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
