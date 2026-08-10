// Use unknown for Decimal inputs to avoid depending on Prisma runtime types in
// shared code used by tests and runtime.
export const serializeDecimal = (value: unknown | number | string): number => {
    return Number(value as unknown as number)
}

export const serializeDecimalNullable = (
    value?: unknown | number | string | null,
): number | null => {
    if (value === null || value === undefined) return null
    return serializeDecimal(value)
}

/** Convert a decimal monetary value to integer cents without binary floating-point arithmetic. */
export const toCents = (value: unknown | number | string): bigint => {
    const text = String(value).trim()
    const match = text.match(/^(-?)(\d+)(?:\.(\d+))?$/)

    if (!match) throw new TypeError(`Invalid monetary value: ${text}`)

    const [, sign, whole, fraction = ''] = match
    const roundedFraction = fraction.padEnd(3, '0').slice(0, 3)
    let cents = BigInt(whole ?? '0') * 100n + BigInt(roundedFraction.slice(0, 2))

    if (roundedFraction[2] && roundedFraction[2] >= '5') cents += 1n

    return sign === '-' ? -cents : cents
}

export const fromCents = (cents: bigint): number => Number(cents) / 100

export default { serializeDecimal, serializeDecimalNullable, toCents, fromCents }
