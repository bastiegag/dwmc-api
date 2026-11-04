import { z } from 'zod'

export const MAX_DECIMAL_12_2 = 9_999_999_999.99

const hasAtMostTwoDecimalPlaces = (value: number) => {
    return Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON * 100
}

export const monetaryNumberSchema = z.preprocess(
    (value) => {
        if (typeof value !== 'string') return value

        const trimmed = value.trim()
        return trimmed === '' ? undefined : Number(trimmed)
    },
    z
        .number()
        .finite('Amount must be finite')
        .refine(hasAtMostTwoDecimalPlaces, 'Amount must have at most 2 decimal places')
        .refine(
            (value) => Math.abs(value) <= MAX_DECIMAL_12_2,
            'Amount exceeds the maximum supported value',
        ),
)
