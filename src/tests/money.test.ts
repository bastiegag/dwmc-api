import { describe, expect, it } from 'vitest'
import { fromCents, toCents } from '../shared/money/decimal.js'

describe('money arithmetic', () => {
    it('converts decimal values to exact integer cents', () => {
        expect(toCents('0.1')).toBe(10n)
        expect(toCents('0.2')).toBe(20n)
        expect(toCents('-850.75')).toBe(-85075n)
    })

    it('rounds values beyond cents consistently', () => {
        expect(toCents('1.005')).toBe(101n)
        expect(toCents('-1.005')).toBe(-101n)
    })

    it('round-trips large balances without cent loss', () => {
        const cents = toCents('9999999999.99')

        expect(cents).toBe(999999999999n)
        expect(fromCents(cents)).toBe(9999999999.99)
    })
})
