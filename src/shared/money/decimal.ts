// Use unknown for Decimal inputs to avoid depending on Prisma runtime types in
// shared code used by tests and runtime.
export function serializeDecimal(value: unknown | number | string): number {
    return Number(value as unknown as number)
}

export function serializeDecimalNullable(value?: unknown | number | string | null): number | null {
    if (value === null || value === undefined) return null
    return serializeDecimal(value)
}

export default { serializeDecimal, serializeDecimalNullable }
