export type UtcMonthRange = {
    start: Date
    next: Date
    startIso: string
    nextIso: string
}

export const getUtcMonthRange = (month: string): UtcMonthRange => {
    const [yearText, monthText] = month.split('-')
    const year = Number(yearText)
    const monthNumber = Number(monthText)
    const start = new Date(Date.UTC(year, monthNumber - 1, 1))
    const next = new Date(Date.UTC(year, monthNumber, 1))

    return {
        start,
        next,
        startIso: start.toISOString(),
        nextIso: next.toISOString(),
    }
}
