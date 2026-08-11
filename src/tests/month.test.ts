import { describe, expect, it } from 'vitest'
import { getUtcMonthRange } from '../shared/date/month.js'

describe('UTC month ranges', () => {
    it('handles leap-year February with an exclusive next-month boundary', () => {
        const range = getUtcMonthRange('2028-02')

        expect(range.startIso).toBe('2028-02-01T00:00:00.000Z')
        expect(range.nextIso).toBe('2028-03-01T00:00:00.000Z')
    })

    it('handles the December to January boundary in UTC', () => {
        const range = getUtcMonthRange('2026-12')

        expect(range.startIso).toBe('2026-12-01T00:00:00.000Z')
        expect(range.nextIso).toBe('2027-01-01T00:00:00.000Z')
    })
})
